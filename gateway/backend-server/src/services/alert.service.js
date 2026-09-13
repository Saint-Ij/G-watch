import { eq, and } from "drizzle-orm";
import db from "../db/index.js";
import { alerts } from "../db/schema.js";
import { emitEvent } from "../socket/index.js";
import { logAlert } from "../utils/logger.js";

export async function createAlert({ integrationId, eventId, severity, title, description, riskScore }) {
  const [alert] = await db
    .insert(alerts)
    .values({ integrationId, eventId, severity, title, description, riskScore })
    .returning();

  logAlert(alert);
  emitEvent("alert:new", {
    alertId: alert.id,
    integrationId,
    severity,
    title,
    riskScore,
  });

  return alert;
}

export async function getAlerts({ status, severity, integrationId, limit = 50 } = {}) {
  let query = db.select().from(alerts);

  const conditions = [];
  if (status) conditions.push(eq(alerts.status, status));
  if (severity) conditions.push(eq(alerts.severity, severity));
  if (integrationId) conditions.push(eq(alerts.integrationId, integrationId));

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  return query.orderBy(alerts.createdAt).limit(limit);
}

export async function getAlertById(id) {
  const [alert] = await db
    .select()
    .from(alerts)
    .where(eq(alerts.id, id))
    .limit(1);

  return alert || null;
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

export async function getOpenAlertsCount() {
  const results = await db
    .select({ id: alerts.id })
    .from(alerts)
    .where(eq(alerts.status, "open"));
  return results.length;
}
