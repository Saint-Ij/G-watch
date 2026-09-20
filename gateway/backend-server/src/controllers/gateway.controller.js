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

export async function handleGatewayRequest(req, res) {
  const startTime = Date.now();

  try {
    const { integrationId, credentialId, authMethod } = req.integrationContext;

    // 1. Fetch integration
    const integration = await integrationService.getIntegrationById(integrationId);

    if (integration.status !== "active") {
      return res.status(403).json({ error: "Integration is not active" });
    }

    // 2. Determine resource and action
    const resourceName = req.headers["x-resource-name"]
      || (req.body && req.body.resource)
      || extractResourceFromPath(req.path);
    const action = req.method === "GET" ? "read" : req.method === "DELETE" ? "delete" : "write";

    // 3. Check permission
    const { permission, resource } = await permissionService.checkPermission(
      integrationId,
      resourceName,
      action
    );

    // 4. Process through gateway pipeline (anomaly detection, risk scoring, event recording)
    const result = await gatewayService.processGatewayRequest(req, {
      integrationId,
      credentialId,
      permission,
      resource,
      userId: integration.ownerId,
    });

    // 5. Update last seen
    await integrationService.updateIntegration(integrationId, { lastSeenAt: new Date() });

    // 6. Emit risk level change event
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

    // 9. No target URL: return status response (demo/simulator mode)
    if (!integration.targetUrl) {
      return res.json({
        status: "processed",
        decision: result.decision.decision,
        riskScore: result.risk.score,
        riskLevel: result.risk.level,
        anomalyDetected: result.risk.anomalies.length > 0,
      });
    }

    // 10. Proxy to target backend
    const proxyStartTime = Date.now();
    try {
      const targetBase = integration.targetUrl.replace(/\/+$/, "");
      const targetPath = req.originalUrl.replace(/^\/gateway\/[^/]+/, "");

      // Build sanitized headers for the proxied request
      const proxyHeaders = {
        "x-gwatch-decision": result.decision.decision,
        "x-gwatch-risk-score": String(result.risk.score),
        "x-gwatch-risk-level": result.risk.level,
        "x-gwatch-integration-id": integrationId,
        "x-gwatch-integration-slug": integration.slug,
        "x-forwarded-for": getSourceIp(req),
      };

      // Forward content-type and accept from original request
      if (req.headers["content-type"]) {
        proxyHeaders["content-type"] = req.headers["content-type"];
      }
      if (req.headers["accept"]) {
        proxyHeaders["accept"] = req.headers["accept"];
      }

      const proxyRes = await axios({
        method: req.method.toLowerCase(),
        url: `${targetBase}${targetPath}`,
        headers: proxyHeaders,
        data: req.method !== "GET" && req.body ? req.body : undefined,
        params: req.query,
        timeout: PROXY_TIMEOUT,
        validateStatus: () => true, // don't throw on 4xx/5xx
        maxRedirects: 5,
      });

      const proxyLatency = Date.now() - proxyStartTime;

      // Update the event record with the actual backend response status
      await eventService.updateEventStatus(result.event.id, proxyRes.status, proxyLatency);

      // Forward backend response headers (skip hop-by-hop headers)
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

      // Add G-Watch metadata headers to the response
      res.setHeader("x-gwatch-decision", result.decision.decision);
      res.setHeader("x-gwatch-risk-score", String(result.risk.score));
      res.setHeader("x-gwatch-risk-level", result.risk.level);
      res.setHeader("x-gwatch-latency", String(proxyLatency));

      // Return the backend's actual response
      const contentType = proxyRes.headers["content-type"] || "application/json";
      if (contentType.includes("application/json")) {
        return res.status(proxyRes.status).json(proxyRes.data);
      }
      if (contentType.includes("text/")) {
        return res.status(proxyRes.status).send(proxyRes.data);
      }
      // Binary or other content types
      return res.status(proxyRes.status).send(Buffer.from(proxyRes.data));
    } catch (proxyErr) {
      const proxyLatency = Date.now() - proxyStartTime;

      // Log the proxy failure
      console.error(`[Gateway Proxy] ${req.method} ${req.originalUrl} → ${integration.targetUrl} FAILED (${proxyErr.code || proxyErr.message}) in ${proxyLatency}ms`);

      // Update event with 502 status
      if (result.event) {
        await eventService.updateEventStatus(result.event.id, 502, proxyLatency);
      }

      return res.status(502).json({
        error: "Target backend unreachable",
        gatewayDecision: result.decision.decision,
        riskScore: result.risk.score,
        riskLevel: result.risk.level,
        targetUrl: integration.targetUrl,
        details: proxyErr.code || "ECONNREFUSED",
      });
    }
  } catch (error) {
    console.error("[Gateway Error]", error);
    res.status(500).json({ error: "Internal gateway error" });
  }
}

function extractResourceFromPath(path) {
  const segments = path.split("/").filter(Boolean);
  for (const seg of segments) {
    if (!seg.startsWith(":") && seg !== "gateway" && seg !== "integrations") {
      return seg;
    }
  }
  return "unknown";
}
