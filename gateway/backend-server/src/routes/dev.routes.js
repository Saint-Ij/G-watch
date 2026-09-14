import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { identifyIntegration, validateIntegrationCredential, checkRateLimit } from "../middleware/gateway.js";
import { processGatewayRequest } from "../services/gateway.service.js";
import * as integrationService from "../services/integration.service.js";
import * as permissionService from "../services/permission.service.js";
import { getSourceIp } from "../utils/helpers.js";

const router = Router();

const scenarios = [
  {
    name: "NORMAL",
    description: "Normal delivery request to customer address",
    integrationSlug: "delivery-provider",
    method: "GET",
    path: "/customers/123/address",
    dataCategory: "customer_address",
    recordsAccessed: 1,
    sourceIp: "10.0.0.5",
  },
  {
    name: "HIGH_VOLUME",
    description: "Delivery provider requests 10,000 customer profiles",
    integrationSlug: "delivery-provider",
    method: "GET",
    path: "/customers",
    dataCategory: "customer_profile",
    recordsAccessed: 10000,
    sourceIp: "10.0.0.5",
  },
  {
    name: "NEW_DATA",
    description: "Delivery provider accesses payment data for the first time",
    integrationSlug: "delivery-provider",
    method: "GET",
    path: "/payments",
    dataCategory: "payment_data",
    recordsAccessed: 50,
    sourceIp: "10.0.0.5",
  },
  {
    name: "UNAUTHORIZED",
    description: "Delivery provider tries to access identity data without permission",
    integrationSlug: "delivery-provider",
    method: "GET",
    path: "/identity-verification",
    dataCategory: "identity_data",
    recordsAccessed: 100,
    sourceIp: "10.0.0.5",
  },
  {
    name: "REPEATED_ATTACK",
    description: "Delivery provider repeatedly tries to access forbidden resources",
    integrationSlug: "delivery-provider",
    method: "POST",
    path: "/admin/users",
    dataCategory: "internal_data",
    recordsAccessed: 5000,
    sourceIp: "192.168.1.100",
  },
  {
    name: "SUSPICIOUS_IP",
    description: "Payment provider from unknown IP address",
    integrationSlug: "payment-provider",
    method: "GET",
    path: "/transactions",
    dataCategory: "payment_data",
    recordsAccessed: 200,
    sourceIp: "203.0.113.50",
  },
];

router.get("/scenarios", authenticate, (req, res) => {
  res.json({
    scenarios: scenarios.map((s) => ({
      name: s.name,
      description: s.description,
    })),
  });
});

router.post("/simulate-event", authenticate, authorize("admin"), async (req, res) => {
  try {
    const {
      integrationSlug,
      method,
      path,
      dataCategory,
      recordsAccessed,
      sourceIp,
    } = req.body;

    const integration = await integrationService.getIntegrationBySlug(integrationSlug);
    if (!integration) {
      return res.status(404).json({ error: "Integration not found" });
    }

    if (integration.status !== "active") {
      return res.status(403).json({ error: "Integration is not active" });
    }

    const resourceName = extractResourceFromPath(path);
    const action = method === "GET" ? "read" : method === "DELETE" ? "delete" : "write";

    const { allowed, permission, resource } = await permissionService.checkPermission(
      integration.id,
      resourceName,
      action
    );

    const mockReq = {
      method,
      path,
      originalUrl: path,
      body: { resource: resourceName },
      headers: {
        "x-forwarded-for": sourceIp || "10.0.0.1",
        "user-agent": "dev-simulator",
      },
      integrationContext: {
        identified: true,
        integrationId: integration.id,
        credentialId: null,
        authMethod: "dev_simulation",
      },
    };

    const result = await processGatewayRequest(mockReq, {
      integrationId: integration.id,
      credentialId: null,
      permission,
      resource,
    });

    await integrationService.updateIntegration(integration.id, { lastSeenAt: new Date() });

    res.json({
      scenario: req.body.scenario || "custom",
      integration: integration.name,
      result: {
        decision: result.decision.decision,
        riskScore: result.risk.score,
        riskLevel: result.risk.level,
        reasons: result.risk.reasons,
        anomalyDetected: result.risk.anomalies.length > 0,
        permissionDenied: result.permissionDenied,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/simulate-scenario/:name", authenticate, authorize("admin"), async (req, res) => {
  try {
    const scenario = scenarios.find((s) => s.name === req.params.name);
    if (!scenario) {
      return res.status(404).json({ error: "Scenario not found" });
    }

    const integration = await integrationService.getIntegrationBySlug(scenario.integrationSlug);
    if (!integration) {
      return res.status(404).json({ error: "Integration not found" });
    }

    const resourceName = extractResourceFromPath(scenario.path);
    const action = scenario.method === "GET" ? "read" : scenario.method === "POST" ? "write" : "delete";

    const { allowed, permission, resource } = await permissionService.checkPermission(
      integration.id,
      resourceName,
      action
    );

    const mockReq = {
      method: scenario.method,
      path: scenario.path,
      originalUrl: scenario.path,
      body: { resource: resourceName },
      headers: {
        "x-forwarded-for": scenario.sourceIp,
        "user-agent": "dev-simulator",
      },
      integrationContext: {
        identified: true,
        integrationId: integration.id,
        credentialId: null,
        authMethod: "dev_simulation",
      },
    };

    const result = await processGatewayRequest(mockReq, {
      integrationId: integration.id,
      credentialId: null,
      permission,
      resource,
      userId: integration.ownerId,
    });

    await integrationService.updateIntegration(integration.id, { lastSeenAt: new Date() });

    res.json({
      scenario: scenario.name,
      description: scenario.description,
      integration: integration.name,
      result: {
        decision: result.decision.decision,
        riskScore: result.risk.score,
        riskLevel: result.risk.level,
        reasons: result.risk.reasons,
        anomalyDetected: result.risk.anomalies.length > 0,
        permissionDenied: result.permissionDenied,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Batch simulation for false-alarm demo
router.post("/simulate-batch", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { scenarioName, count = 10, delayMs = 200 } = req.body;
    const scenario = scenarios.find((s) => s.name === scenarioName);
    if (!scenario) {
      return res.status(404).json({ error: "Scenario not found" });
    }

    const integration = await integrationService.getIntegrationBySlug(scenario.integrationSlug);
    if (!integration) {
      return res.status(404).json({ error: "Integration not found" });
    }

    const results = [];
    for (let i = 0; i < Math.min(count, 100); i++) {
      const resourceName = extractResourceFromPath(scenario.path);
    const action = scenario.method === "GET" ? "read" : scenario.method === "DELETE" ? "delete" : "write";

      const { permission, resource } = await permissionService.checkPermission(
        integration.id, resourceName, action
      );

      const mockReq = {
        method: scenario.method,
        path: scenario.path,
        originalUrl: scenario.path,
        body: { resource: resourceName },
        headers: {
          "x-forwarded-for": scenario.sourceIp,
          "user-agent": "dev-simulator",
        },
        integrationContext: {
          identified: true,
          integrationId: integration.id,
          credentialId: null,
          authMethod: "dev_simulation",
        },
      };

    const result = await processGatewayRequest(mockReq, {
      integrationId: integration.id,
      credentialId: null,
      permission,
      resource,
      userId: integration.ownerId,
    });

      await integrationService.updateIntegration(integration.id, { lastSeenAt: new Date() });

      results.push({
        index: i + 1,
        decision: result.decision.decision,
        riskScore: result.risk.score,
        riskLevel: result.risk.level,
        anomalyDetected: result.risk.anomalies.length > 0,
      });

      if (delayMs > 0 && i < count - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    const summary = {
      total: results.length,
      allowed: results.filter((r) => r.decision === "allow").length,
      monitored: results.filter((r) => r.decision === "monitor").length,
      alerted: results.filter((r) => r.decision === "alert").length,
      blocked: results.filter((r) => r.decision === "block").length,
      avgRiskScore: Math.round(results.reduce((s, r) => s + r.riskScore, 0) / results.length),
      maxRiskScore: Math.max(...results.map((r) => r.riskScore)),
      anomaliesDetected: results.filter((r) => r.anomalyDetected).length,
    };

    res.json({ scenario: scenario.name, results, summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function extractResourceFromPath(path) {
  const segments = path.split("/").filter(Boolean);
  for (const seg of segments) {
    if (!seg.startsWith(":") && seg !== "gateway" && seg !== "integrations") {
      return seg;
    }
  }
  return "unknown";
}

export default router;
