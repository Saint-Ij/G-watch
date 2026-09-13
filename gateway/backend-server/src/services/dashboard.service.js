import { eq, and, gte, sql } from "drizzle-orm";
import db from "../db/index.js";
import { integrations, integrationEvents, alerts, integrationPermissions, dataResources } from "../db/schema.js";

export async function getOverview() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Total integrations
  const allIntegrations = await db.select().from(integrations);
  const totalIntegrations = allIntegrations.length;
  const activeIntegrations = allIntegrations.filter((i) => i.status === "active").length;
  const highRiskIntegrations = allIntegrations.filter(
    (i) => i.riskLevel === "high" || i.riskLevel === "critical"
  ).length;

  // Today's events
  const todayEvents = await db
    .select()
    .from(integrationEvents)
    .where(gte(integrationEvents.createdAt, todayStart));

  const requestsToday = todayEvents.length;
  const anomaliesToday = todayEvents.filter((e) => e.anomalyDetected).length;
  const blockedRequests = todayEvents.filter((e) => e.decision === "block").length;

  // Open alerts
  const openAlerts = await db
    .select({ id: alerts.id })
    .from(alerts)
    .where(eq(alerts.status, "open"));

  return {
    totalIntegrations,
    activeIntegrations,
    requestsToday,
    anomaliesToday,
    openAlerts: openAlerts.length,
    blockedRequests,
    highRiskIntegrations,
  };
}

export async function getActivity(limit = 20) {
  const events = await db
    .select({
      id: integrationEvents.id,
      integrationId: integrationEvents.integrationId,
      method: integrationEvents.method,
      path: integrationEvents.path,
      riskScore: integrationEvents.riskScore,
      decision: integrationEvents.decision,
      anomalyDetected: integrationEvents.anomalyDetected,
      createdAt: integrationEvents.createdAt,
    })
    .from(integrationEvents)
    .orderBy(integrationEvents.createdAt)
    .limit(limit);

  return events;
}

export async function getRiskStats() {
  const events = await db.select().from(integrationEvents);

  const riskDistribution = { low: 0, medium: 0, high: 0, critical: 0 };
  const decisionCounts = { allow: 0, monitor: 0, alert: 0, block: 0, rate_limit: 0 };

  events.forEach((e) => {
    if (e.riskScore <= 30) riskDistribution.low++;
    else if (e.riskScore <= 60) riskDistribution.medium++;
    else if (e.riskScore <= 80) riskDistribution.high++;
    else riskDistribution.critical++;

    if (e.decision && decisionCounts[e.decision] !== undefined) {
      decisionCounts[e.decision]++;
    }
  });

  return { riskDistribution, decisionCounts, totalEvents: events.length };
}

export async function getDataAccessStats() {
  const events = await db.select().from(integrationEvents);

  const categoryCounts = {};
  events.forEach((e) => {
    if (e.dataCategory) {
      categoryCounts[e.dataCategory] = (categoryCounts[e.dataCategory] || 0) + 1;
    }
  });

  return { dataCategories: categoryCounts, totalEvents: events.length };
}

export async function getIntegrationDashboard(integrationId) {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, integrationId))
    .limit(1);

  if (!integration) throw new Error("Integration not found");

  const events = await db
    .select()
    .from(integrationEvents)
    .where(eq(integrationEvents.integrationId, integrationId));

  const integrationAlerts = await db
    .select()
    .from(alerts)
    .where(eq(alerts.integrationId, integrationId))
    .orderBy(alerts.createdAt);

  const permissions = await db
    .select({
      id: integrationPermissions.id,
      action: integrationPermissions.action,
      allowed: integrationPermissions.allowed,
      category: dataResources.category,
      resourceName: dataResources.name,
    })
    .from(integrationPermissions)
    .innerJoin(dataResources, eq(integrationPermissions.resourceId, dataResources.id))
    .where(eq(integrationPermissions.integrationId, integrationId));

  const totalRequests = events.length;
  const blockedRequests = events.filter((e) => e.decision === "block").length;
  const anomalies = events.filter((e) => e.anomalyDetected).length;

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
    integration,
    totalRequests,
    blockedRequests,
    anomalies,
    dataCategories,
    endpoints,
    permissions,
    recentAlerts: integrationAlerts.slice(0, 10),
  };
}
