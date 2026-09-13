import logger from "../../logger.js";

export function logAudit({ userId, action, resourceType, resourceId, metadata, ipAddress }) {
  logger.info({
    audit: true,
    userId,
    action,
    resourceType,
    resourceId,
    metadata,
    ipAddress,
    timestamp: new Date().toISOString(),
  });
}

export function logEvent(event) {
  logger.info({
    gateway: true,
    integrationId: event.integrationId,
    method: event.method,
    path: event.path,
    riskScore: event.riskScore,
    decision: event.decision,
    anomalyDetected: event.anomalyDetected,
    timestamp: new Date().toISOString(),
  });
}

export function logAlert(alert) {
  logger.warn({
    alert: true,
    integrationId: alert.integrationId,
    severity: alert.severity,
    title: alert.title,
    riskScore: alert.riskScore,
    timestamp: new Date().toISOString(),
  });
}
