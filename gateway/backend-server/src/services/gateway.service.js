import { getSourceIp, getUserAgent } from "../utils/helpers.js";
import { getOrCreateBaseline, updateBaseline } from "./baseline.service.js";
import { detectAnomalies, calculateRiskScore, decideAction } from "./anomaly.service.js";
import { recordEvent } from "./event.service.js";
import { createAlert } from "./alert.service.js";
import { emitEvent } from "../socket/index.js";

export async function processGatewayRequest(req, { integrationId, credentialId, permission, resource }) {
  const startTime = Date.now();

  // 1. Build event data
  const eventData = {
    integrationId,
    credentialId: credentialId || null,
    method: req.method,
    path: req.originalUrl || req.path,
    resource: resource?.name || null,
    action: req.method === "GET" ? "read" : req.method === "POST" ? "write" : "delete",
    dataCategory: resource?.category || null,
    recordsAccessed: parseInt(req.headers["x-records-count"]) || 0,
    sourceIp: getSourceIp(req),
    userAgent: getUserAgent(req),
    authenticationMethod: req.integrationContext?.authMethod || "unknown",
  };

  // 2. Get baseline
  const baseline = await getOrCreateBaseline(integrationId);

  // 3. Detect anomalies
  const detection = detectAnomalies(eventData, baseline);

  // 4. Check permission
  const permissionDenied = !permission || !permission.allowed;

  // 5. Calculate risk score
  const risk = calculateRiskScore(detection, permissionDenied);

  // 6. Decide action
  const actionDecision = decideAction(risk.level);

  // 7. Record event
  const event = await recordEvent({
    ...eventData,
    responseStatus: actionDecision.decision === "block" ? 403 : 200,
    responseTime: Date.now() - startTime,
    riskScore: risk.score,
    decision: actionDecision.decision,
    anomalyDetected: detection.hasAnomaly,
    anomalyType: detection.anomalies.map((a) => a.type).join(",") || null,
  });

  // 8. Update baseline periodically
  await updateBaseline(integrationId, event);

  // 9. Emit Socket.IO events
  emitEvent("integration:event", {
    integrationId,
    method: eventData.method,
    path: eventData.path,
    riskScore: risk.score,
    riskLevel: risk.level,
    decision: actionDecision.decision,
    anomalyDetected: detection.hasAnomaly,
  });

  // 10. Create alerts if needed
  if (actionDecision.alert || risk.level === "critical" || risk.level === "high") {
    await createAlert({
      integrationId,
      eventId: event.id,
      severity: risk.level,
      title: `Security alert for ${eventData.path}`,
      description: risk.reasons.join("; "),
      riskScore: risk.score,
    });
  }

  if (detection.hasAnomaly) {
    emitEvent("integration:anomaly", {
      integrationId,
      path: eventData.path,
      anomalies: detection.anomalies,
      riskScore: risk.score,
    });
  }

  // 11. Return result
  return {
    event,
    risk,
    decision: actionDecision,
    permissionDenied,
  };
}
