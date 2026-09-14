import { eq, and, desc } from "drizzle-orm";
import db from "../db/index.js";
import { alerts, integrationEvents, integrations } from "../db/schema.js";
import { emitEvent } from "../socket/index.js";
import { logAlert } from "../utils/logger.js";

export async function createAlert({ integrationId, eventId, userId, severity, title, description, riskScore, recommendedDecision, anomalies }) {
  const [alert] = await db
    .insert(alerts)
    .values({ integrationId, eventId, userId, severity, title, description, riskScore, recommendedDecision })
    .returning();

  logAlert(alert);
  emitEvent("alert:new", {
    alertId: alert.id,
    integrationId,
    severity,
    title,
    riskScore,
    recommendedDecision,
    anomalies: anomalies || [],
  });

  return alert;
}

export async function getAlerts({ status, severity, integrationId, userId, limit = 50 } = {}) {
  let query = db.select().from(alerts);

  const conditions = [];
  if (status) conditions.push(eq(alerts.status, status));
  if (severity) conditions.push(eq(alerts.severity, severity));
  if (integrationId) conditions.push(eq(alerts.integrationId, integrationId));
  if (userId) conditions.push(eq(alerts.userId, userId));

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  return query.orderBy(desc(alerts.createdAt)).limit(limit);
}

export async function getAlertById(id) {
  const [alert] = await db
    .select()
    .from(alerts)
    .where(eq(alerts.id, id))
    .limit(1);

  if (!alert) return null;

  // Fetch related event for full context
  let event = null;
  if (alert.eventId) {
    const [evt] = await db
      .select()
      .from(integrationEvents)
      .where(eq(integrationEvents.id, alert.eventId))
      .limit(1);
    event = evt || null;
  }

  // Fetch integration name
  let integration = null;
  if (alert.integrationId) {
    const [intg] = await db
      .select({ id: integrations.id, name: integrations.name, slug: integrations.slug })
      .from(integrations)
      .where(eq(integrations.id, alert.integrationId))
      .limit(1);
    integration = intg || null;
  }

  return { ...alert, event, integration };
}

export async function updateAlert(id, updates) {
  const [alert] = await db
    .select()
    .from(alerts)
    .where(eq(alerts.id, id))
    .limit(1);

  if (!alert) {
    throw new Error("Alert not found");
  }

  const [updated] = await db
    .update(alerts)
    .set(updates)
    .where(eq(alerts.id, id))
    .returning();

  return updated;
}

export async function acknowledgeAlert(id) {
  return updateAlert(id, { status: "acknowledged", acknowledgedAt: new Date() });
}

export async function resolveAlert(id) {
  return updateAlert(id, { status: "resolved", resolvedAt: new Date() });
}

export async function reviewAlert(id, { adminDecision, adminDecisionBy, adminNotes }) {
  const updates = {
    adminDecision,
    adminDecisionBy,
    adminDecisionAt: new Date(),
    adminNotes: adminNotes || null,
  };

  // Map decision to status
  if (adminDecision === "allow" || adminDecision === "monitor" || adminDecision === "block") {
    updates.status = "resolved";
    updates.resolvedAt = new Date();
  }

  const updated = await updateAlert(id, updates);

  emitEvent("alert:reviewed", {
    alertId: id,
    adminDecision,
    adminDecisionBy,
    adminNotes,
  });

  return updated;
}

export async function getOpenAlertsCount() {
  const results = await db
    .select({ id: alerts.id })
    .from(alerts)
    .where(eq(alerts.status, "open"));
  return results.length;
}
