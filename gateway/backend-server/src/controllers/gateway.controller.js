import * as gatewayService from "../services/gateway.service.js";
import * as permissionService from "../services/permission.service.js";
import * as integrationService from "../services/integration.service.js";
import { getSourceIp } from "../utils/helpers.js";

export async function handleGatewayRequest(req, res) {
  try {
    const { integrationId, credentialId, authMethod } = req.integrationContext;

    // Get integration
    const integration = await integrationService.getIntegrationById(integrationId);

    // Check if integration is active
    if (integration.status !== "active") {
      return res.status(403).json({ error: "Integration is not active" });
    }

    // Map path to resource and action
    const resourceName = req.body.resource || extractResourceFromPath(req.path);
    const action = req.method === "GET" ? "read" : req.method === "POST" ? "write" : "delete";

    // Check permission
    const { allowed, permission, resource } = await permissionService.checkPermission(
      integrationId,
      resourceName,
      action
    );

    // Process through gateway
    const result = await gatewayService.processGatewayRequest(req, {
      integrationId,
      credentialId,
      permission,
      resource,
    });

    // Update integration last seen
    await integrationService.updateIntegration(integrationId, { lastSeenAt: new Date() });

    // Update risk level if changed
    if (result.risk.level !== integration.riskLevel) {
      const { emitEvent } = await import("../socket/index.js");
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

    // Respond
    if (result.decision.decision === "block") {
      return res.status(403).json({
        error: "Request blocked",
        riskScore: result.risk.score,
        riskLevel: result.risk.level,
        reasons: result.risk.reasons,
      });
    }

    if (result.permissionDenied) {
      return res.status(403).json({
        error: "Permission denied",
        riskScore: result.risk.score,
      });
    }

    res.json({
      status: "processed",
      decision: result.decision.decision,
      riskScore: result.risk.score,
      riskLevel: result.risk.level,
      anomalyDetected: result.risk.anomalies.length > 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function extractResourceFromPath(path) {
  const segments = path.split("/").filter(Boolean);
  // Try to find a resource-like segment
  for (const seg of segments) {
    if (!seg.startsWith(":") && seg !== "gateway" && seg !== "integrations") {
      return seg;
    }
  }
  return "unknown";
}
