import { eq } from "drizzle-orm";
import db from "../db/index.js";
import { integrationEvents } from "../db/schema.js";

export async function recordEvent(eventData) {
  const [event] = await db
    .insert(integrationEvents)
    .values(eventData)
    .returning();

  return event;
}

export async function getEventsByIntegration(integrationId, limit = 100) {
  return db
    .select()
    .from(integrationEvents)
    .where(eq(integrationEvents.integrationId, integrationId))
    .orderBy(integrationEvents.createdAt)
    .limit(limit);
}

export async function getRecentEvents(limit = 50) {
  return db
    .select()
    .from(integrationEvents)
    .orderBy(integrationEvents.createdAt)
    .limit(limit);
}

export async function getEventStats(integrationId) {
  const events = await getEventsByIntegration(integrationId, 1000);

  const totalRequests = events.length;
  const blockedRequests = events.filter((e) => e.decision === "block").length;
  const anomalies = events.filter((e) => e.anomalyDetected).length;
  const avgRiskScore =
    events.length > 0
      ? Math.round(events.reduce((sum, e) => sum + (e.riskScore || 0), 0) / events.length)
      : 0;

  const dataCategories = {};
  events.forEach((e) => {
    if (e.dataCategory) {
      dataCategories[e.dataCategory] = (dataCategories[e.dataCategory] || 0) + 1;
    }
  });

  const endpoints = {};
  events.forEach((e) => {
    endpoints[e.path] = (endpoints[e.path] || 0) + 1;
  });

  return {
    totalRequests,
    blockedRequests,
    anomalies,
    avgRiskScore,
    dataCategories,
    endpoints,
  };
}
