import { eq, and, desc, gte, sql } from "drizzle-orm";
import db from "../db/index.js";
import { integrations, integrationEvents, alerts, integrationPermissions, dataResources, integrationBaselines } from "../db/schema.js";

function userFilter(table, userId, isAdmin) {
  if (isAdmin) return undefined;
  return eq(table.userId || table.ownerId, userId);
}

function intgFilter(userId, isAdmin) {
  if (isAdmin) return undefined;
  return eq(integrations.ownerId, userId);
}

export async function getOverview(userId, isAdmin) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const intgCond = intgFilter(userId, isAdmin);
  const allIntegrations = intgCond
    ? await db.select().from(integrations).where(intgCond)
    : await db.select().from(integrations);

  const totalIntegrations = allIntegrations.length;
  const activeIntegrations = allIntegrations.filter((i) => i.status === "active").length;
  const highRiskIntegrations = allIntegrations.filter(
    (i) => i.riskLevel === "high" || i.riskLevel === "critical"
  ).length;

  const intgIds = allIntegrations.map((i) => i.id);
  let todayEvents;
  if (intgIds.length === 0) {
    todayEvents = [];
  } else {
    todayEvents = await db
      .select()
      .from(integrationEvents)
      .where(and(
        gte(integrationEvents.createdAt, todayStart),
        sql`${integrationEvents.integrationId} IN ${intgIds}`
      ));
  }

  const requestsToday = todayEvents.length;
  const anomaliesToday = todayEvents.filter((e) => e.anomalyDetected).length;
  const blockedRequests = todayEvents.filter((e) => e.decision === "block").length;

  let openAlerts;
  if (intgIds.length === 0) {
    openAlerts = [];
  } else {
    openAlerts = await db
      .select({ id: alerts.id })
      .from(alerts)
      .where(and(eq(alerts.status, "open"), sql`${alerts.integrationId} IN ${intgIds}`));
  }

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

export async function getActivity(userId, isAdmin, limit = 20) {
  const intgCond = intgFilter(userId, isAdmin);
  const intgIds = intgCond
    ? (await db.select({ id: integrations.id }).from(integrations).where(intgCond)).map((i) => i.id)
    : null;

  if (intgIds && intgIds.length === 0) return [];

  const where = intgIds
    ? sql`${integrationEvents.integrationId} IN ${intgIds}`
    : undefined;

  return db
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
    .where(where)
    .orderBy(desc(integrationEvents.createdAt))
    .limit(limit);
}

export async function getRiskStats(userId, isAdmin) {
  const intgCond = intgFilter(userId, isAdmin);
  const intgIds = intgCond
    ? (await db.select({ id: integrations.id }).from(integrations).where(intgCond)).map((i) => i.id)
    : null;

  let events;
  if (intgIds && intgIds.length === 0) {
    events = [];
  } else {
    const where = intgIds
      ? sql`${integrationEvents.integrationId} IN ${intgIds}`
      : undefined;
    events = await db.select().from(integrationEvents).where(where);
  }

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

export async function getDataAccessStats(userId, isAdmin) {
  const intgCond = intgFilter(userId, isAdmin);
  const intgIds = intgCond
    ? (await db.select({ id: integrations.id }).from(integrations).where(intgCond)).map((i) => i.id)
    : null;

  let events;
  if (intgIds && intgIds.length === 0) {
    events = [];
  } else {
    const where = intgIds
      ? sql`${integrationEvents.integrationId} IN ${intgIds}`
      : undefined;
    events = await db.select().from(integrationEvents).where(where);
  }

  const categoryCounts = {};
  events.forEach((e) => {
    if (e.dataCategory) {
      categoryCounts[e.dataCategory] = (categoryCounts[e.dataCategory] || 0) + 1;
    }
  });

  return { dataCategories: categoryCounts, totalEvents: events.length };
}

export async function getTrustScores(userId, isAdmin) {
  const intgCond = intgFilter(userId, isAdmin);
  const allIntegrations = intgCond
    ? await db.select().from(integrations).where(intgCond)
    : await db.select().from(integrations);

  const intgIds = allIntegrations.map((i) => i.id);
  if (intgIds.length === 0) return [];

  const allEvents = await db.select().from(integrationEvents)
    .where(sql`${integrationEvents.integrationId} IN ${intgIds}`);
  const allPerms = await db.select().from(integrationPermissions)
    .where(sql`${integrationPermissions.integrationId} IN ${intgIds}`);
  const allAlerts = await db.select().from(alerts)
    .where(sql`${alerts.integrationId} IN ${intgIds}`);

  const scores = allIntegrations.map((intg) => {
    const intgEvents = allEvents.filter((e) => e.integrationId === intg.id);
    const intgPerms = allPerms.filter((p) => p.integrationId === intg.id);
    const intgAlerts = allAlerts.filter((a) => a.integrationId === intg.id);

    let score = 100;
    if (intg.riskLevel === "critical") score -= 40;
    else if (intg.riskLevel === "high") score -= 25;
    else if (intg.riskLevel === "medium") score -= 10;
    const recentEvents = intgEvents.slice(-50);
    const anomalyRate = recentEvents.length > 0
      ? recentEvents.filter((e) => e.anomalyDetected).length / recentEvents.length : 0;
    score -= Math.round(anomalyRate * 30);
    const blockRate = recentEvents.length > 0
      ? recentEvents.filter((e) => e.decision === "block").length / recentEvents.length : 0;
    score -= Math.round(blockRate * 20);
    const openAlerts = intgAlerts.filter((a) => a.status === "open").length;
    score -= Math.min(openAlerts * 5, 15);
    score = Math.max(0, Math.min(100, score));

    let level;
    if (score >= 80) level = "high";
    else if (score >= 60) level = "medium";
    else if (score >= 40) level = "low";
    else level = "critical";

    return {
      integrationId: intg.id,
      name: intg.name,
      slug: intg.slug,
      status: intg.status,
      riskLevel: intg.riskLevel,
      trustScore: score,
      trustLevel: level,
      totalEvents: intgEvents.length,
      anomalyCount: intgEvents.filter((e) => e.anomalyDetected).length,
      blockCount: intgEvents.filter((e) => e.decision === "block").length,
      openAlerts,
      permissionCount: intgPerms.length,
      allowedPermissions: intgPerms.filter((p) => p.allowed).length,
      lastSeenAt: intg.lastSeenAt,
    };
  });

  return scores;
}

export async function getDataAccessMatrix(userId, isAdmin) {
  const intgCond = intgFilter(userId, isAdmin);
  const allIntegrations = intgCond
    ? await db.select().from(integrations).where(intgCond)
    : await db.select().from(integrations);

  const intgIds = allIntegrations.map((i) => i.id);

  const allPerms = intgIds.length > 0
    ? await db
        .select({
          integrationId: integrationPermissions.integrationId,
          action: integrationPermissions.action,
          allowed: integrationPermissions.allowed,
          category: dataResources.category,
          resourceName: dataResources.name,
          sensitivity: dataResources.sensitivity,
        })
        .from(integrationPermissions)
        .innerJoin(dataResources, eq(integrationPermissions.resourceId, dataResources.id))
        .where(sql`${integrationPermissions.integrationId} IN ${intgIds}`)
    : [];
  const allEvents = intgIds.length > 0
    ? await db.select().from(integrationEvents)
        .where(sql`${integrationEvents.integrationId} IN ${intgIds}`)
    : [];

  const categories = [...new Set(allPerms.map((p) => p.category))].sort();

  const matrix = allIntegrations.map((intg) => {
    const intgPerms = allPerms.filter((p) => p.integrationId === intg.id);
    const intgEvents = allEvents.filter((e) => e.integrationId === intg.id);

    const cells = categories.map((cat) => {
      const perm = intgPerms.find((p) => p.category === cat);
      const accessed = intgEvents.some((e) => e.dataCategory === cat);
      const accessCount = intgEvents.filter((e) => e.dataCategory === cat).length;
      const hasAnomaly = intgEvents.some(
        (e) => e.dataCategory === cat && e.anomalyDetected
      );

      return {
        category: cat,
        permitted: perm?.allowed || false,
        action: perm?.action || null,
        sensitivity: perm?.sensitivity || null,
        accessed,
        accessCount,
        hasAnomaly,
      };
    });

    const permittedCount = cells.filter((c) => c.permitted).length;
    const accessedCount = cells.filter((c) => c.accessed).length;
    const unusedAccess = cells.filter((c) => c.permitted && !c.accessed).length;
    const unauthorizedAccess = cells.filter((c) => !c.permitted && c.accessed).length;

    return {
      integrationId: intg.id,
      name: intg.name,
      slug: intg.slug,
      status: intg.status,
      riskLevel: intg.riskLevel,
      cells,
      permittedCount,
      accessedCount,
      unusedAccess,
      unauthorizedAccess,
      totalCategories: categories.length,
    };
  });

  return { categories, matrix };
}

export async function getRiskTimeline(userId, isAdmin) {
  const intgCond = intgFilter(userId, isAdmin);
  const intgIds = intgCond
    ? (await db.select({ id: integrations.id }).from(integrations).where(intgCond)).map((i) => i.id)
    : null;

  const where = intgIds
    ? sql`${integrationEvents.integrationId} IN ${intgIds}`
    : undefined;

  const events = await db
    .select({
      riskScore: integrationEvents.riskScore,
      decision: integrationEvents.decision,
      anomalyDetected: integrationEvents.anomalyDetected,
      createdAt: integrationEvents.createdAt,
    })
    .from(integrationEvents)
    .where(where)
    .orderBy(integrationEvents.createdAt);

  const buckets = [];
  for (let i = 0; i < events.length; i += 10) {
    const slice = events.slice(i, i + 10);
    const avgRisk = Math.round(
      slice.reduce((sum, e) => sum + (e.riskScore || 0), 0) / slice.length
    );
    const maxRisk = Math.max(...slice.map((e) => e.riskScore || 0));
    const anomalies = slice.filter((e) => e.anomalyDetected).length;
    const blocked = slice.filter((e) => e.decision === "block").length;
    const timestamp = slice[0].createdAt;

    buckets.push({ timestamp, avgRisk, maxRisk, total: slice.length, anomalies, blocked });
  }

  return { timeline: buckets, totalEvents: events.length };
}

export async function getIntegrationDashboard(integrationId, userId, isAdmin) {
  const conditions = [eq(integrations.id, integrationId)];
  if (!isAdmin) conditions.push(eq(integrations.ownerId, userId));

  const [integration] = await db
    .select()
    .from(integrations)
    .where(and(...conditions))
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
    .orderBy(desc(alerts.createdAt));

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

  const intgPerms = await db.select().from(integrationPermissions)
    .where(eq(integrationPermissions.integrationId, integrationId));
  let trustScore = 100;
  if (integration.riskLevel === "critical") trustScore -= 40;
  else if (integration.riskLevel === "high") trustScore -= 25;
  else if (integration.riskLevel === "medium") trustScore -= 10;
  const recentEvents = events.slice(-50);
  const anomalyRate = recentEvents.length > 0
    ? recentEvents.filter((e) => e.anomalyDetected).length / recentEvents.length : 0;
  trustScore -= Math.round(anomalyRate * 30);
  const blockRate = recentEvents.length > 0
    ? recentEvents.filter((e) => e.decision === "block").length / recentEvents.length : 0;
  trustScore -= Math.round(blockRate * 20);
  const allowedPerms = intgPerms.filter((p) => p.allowed).length;
  if (intgPerms.length > 0 && allowedPerms / intgPerms.length > 0.8 && intgPerms.length > 5) trustScore -= 10;
  const openAlertCount = integrationAlerts.filter((a) => a.status === "open").length;
  trustScore -= Math.min(openAlertCount * 5, 15);
  trustScore = Math.max(0, Math.min(100, trustScore));

  return {
    integration,
    totalRequests,
    blockedRequests,
    anomalies,
    dataCategories,
    endpoints,
    permissions,
    recentAlerts: integrationAlerts.slice(0, 10),
    trustScore,
  };
}
