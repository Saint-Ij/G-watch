import axios from "axios";
import * as gatewayService from "../services/gateway.service.js";
import * as permissionService from "../services/permission.service.js";
import * as integrationService from "../services/integration.service.js";
import * as eventService from "../services/event.service.js";
import { getSourceIp } from "../utils/helpers.js";
import { emitEvent } from "../socket/index.js";

const PROXY_TIMEOUT = parseInt(process.env.PROXY_TIMEOUT) || 10000;

function setGWatchHeaders(res, result) {
  res.setHeader("x-gwatch-decision", result.decision.decision);
  res.setHeader("x-gwatch-risk-score", String(result.risk.score));
  res.setHeader("x-gwatch-risk-level", result.risk.level);
}

/**
 * Transparent proxy handler.
 *
 * The third party calls G-Watch as if it were the real backend:
 *   GET https://gwatch.example.com/customers/123
 *     Header: X-Api-Key: <integration-api-key>
 *
 * G-Watch:
 *   1. Identifies the integration from the API key
 *   2. Runs anomaly detection, risk scoring, permission checks
 *   3. If allowed → proxies to https://api.yourapp.com/customers/123
 *   4. Returns the real backend response
 *
 * The third party never changes their code. They just point at G-Watch.
 */
export async function handleTransparentProxy(req, res) {
  const startTime = Date.now();

  try {
    const { integrationId, credentialId, authMethod } = req.integrationContext;

    // 1. Fetch integration
    const integration = await integrationService.getIntegrationById(integrationId);

    if (integration.status !== "active") {
      return res.status(403).json({ error: "Integration is not active" });
    }

    if (!integration.targetUrl) {
      return res.status(500).json({ error: "Integration has no target URL configured" });
    }

    // 2. Determine resource and action
    const resourceName = extractResourceFromPath(req.path);
    const action = req.method === "GET" ? "read" : req.method === "DELETE" ? "delete" : "write";

    // 3. Check permission
    const { permission, resource } = await permissionService.checkPermission(
      integrationId,
      resourceName,
      action
    );

    // 4. Process through gateway pipeline
    const result = await gatewayService.processGatewayRequest(req, {
      integrationId,
      credentialId,
      permission,
      resource,
      userId: integration.ownerId,
    });

    // 5. Update last seen
    await integrationService.updateIntegration(integrationId, { lastSeenAt: new Date() });

    // 6. Emit risk level change
    if (result.risk.level !== integration.riskLevel) {
      emitEvent("integration:risk", {
        integrationId,
        integrationName: integration.name,
        riskScore: result.risk.score,
        level: result.risk.level,
        decision: result.decision.decision,
      });

      await integrationService.updateIntegration(integrationId, {
        riskLevel: result.risk.level,
      });
    }

    // 7. Block: never forward
    if (result.decision.decision === "block") {
      setGWatchHeaders(res, result);
      return res.status(403).json({
        error: "Request blocked",
        riskScore: result.risk.score,
        riskLevel: result.risk.level,
        reasons: result.risk.reasons,
      });
    }

    // 8. Permission denied: never forward
    if (result.permissionDenied) {
      setGWatchHeaders(res, result);
      return res.status(403).json({
        error: "Permission denied",
        riskScore: result.risk.score,
        riskLevel: result.risk.level,
        reasons: result.risk.reasons,
      });
    }

    // 9. Proxy to target backend (transparent — same path, same method, same body)
    const proxyStartTime = Date.now();
    try {
      const targetBase = integration.targetUrl.replace(/\/+$/, "");
      // Preserve the original request path exactly as-is
      const targetPath = req.originalUrl;

      const proxyHeaders = {
        "x-gwatch-decision": result.decision.decision,
        "x-gwatch-risk-score": String(result.risk.score),
        "x-gwatch-risk-level": result.risk.level,
        "x-gwatch-integration-id": integrationId,
        "x-gwatch-integration-slug": integration.slug,
        "x-forwarded-for": getSourceIp(req),
      };

      // Forward all original headers except hop-by-hop and G-Watch internal ones
      const skipHeaderSet = new Set([
        "host", "connection", "transfer-encoding", "keep-alive",
        "proxy-authenticate", "proxy-authorization", "te", "trailers",
        "upgrade", "x-api-key", "x-records-count",
      ]);
      for (const [key, value] of Object.entries(req.headers)) {
        if (!skipHeaderSet.has(key.toLowerCase())) {
          proxyHeaders[key] = value;
        }
      }

      const proxyRes = await axios({
        method: req.method.toLowerCase(),
        url: `${targetBase}${targetPath}`,
        headers: proxyHeaders,
        data: req.method !== "GET" && req.body ? req.body : undefined,
        params: req.query,
        timeout: PROXY_TIMEOUT,
        validateStatus: () => true,
        maxRedirects: 5,
      });

      const proxyLatency = Date.now() - proxyStartTime;

      // Update event with actual backend status
      await eventService.updateEventStatus(result.event.id, proxyRes.status, proxyLatency);

      // Forward response headers
      const skipHeaders = new Set([
        "transfer-encoding", "content-encoding", "connection",
        "keep-alive", "proxy-authenticate", "proxy-authorization",
        "te", "trailers", "upgrade",
      ]);
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (!skipHeaders.has(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      }

      // Add G-Watch metadata to response
      res.setHeader("x-gwatch-decision", result.decision.decision);
      res.setHeader("x-gwatch-risk-score", String(result.risk.score));
      res.setHeader("x-gwatch-risk-level", result.risk.level);
      res.setHeader("x-gwatch-latency", String(proxyLatency));

      const contentType = proxyRes.headers["content-type"] || "application/json";
      if (contentType.includes("application/json")) {
        return res.status(proxyRes.status).json(proxyRes.data);
      }
      if (contentType.includes("text/")) {
        return res.status(proxyRes.status).send(proxyRes.data);
      }
      return res.status(proxyRes.status).send(Buffer.from(proxyRes.data));
    } catch (proxyErr) {
      const proxyLatency = Date.now() - proxyStartTime;

      console.error(`[Transparent Proxy] ${req.method} ${req.originalUrl} → ${integration.targetUrl} FAILED (${proxyErr.code || proxyErr.message}) in ${proxyLatency}ms`);

      if (result.event) {
        await eventService.updateEventStatus(result.event.id, 502, proxyLatency);
      }

      return res.status(502).json({
        error: "Target backend unreachable",
        gatewayDecision: result.decision.decision,
        riskScore: result.risk.score,
        riskLevel: result.risk.level,
        details: proxyErr.code || "ECONNREFUSED",
      });
    }
  } catch (error) {
    console.error("[Transparent Proxy Error]", error);
    res.status(500).json({ error: "Internal proxy error" });
  }
}

function extractResourceFromPath(path) {
  const segments = path.split("/").filter(Boolean);
  // Skip common prefixes that aren't resource names
  const skip = new Set(["api", "v1", "v2", "v3"]);
  for (const seg of segments) {
    if (!seg.startsWith(":") && !skip.has(seg) && !seg.startsWith("gateway")) {
      return seg;
    }
  }
  return "unknown";
}
