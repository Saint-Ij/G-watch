import { eq, and, gte } from "drizzle-orm";
import db from "../db/index.js";
import { integrationEvents, integrationBaselines, integrations } from "../db/schema.js";

export async function getOrCreateBaseline(integrationId) {
  const [existing] = await db
    .select()
    .from(integrationBaselines)
    .where(eq(integrationBaselines.integrationId, integrationId))
    .limit(1);

  if (existing) return existing;

  const [baseline] = await db
    .insert(integrationBaselines)
    .values({ integrationId })
    .returning();

  return baseline;
}

export async function updateBaseline(integrationId, event) {
  const baseline = await getOrCreateBaseline(integrationId);

  const recentEvents = await db
    .select()
    .from(integrationEvents)
    .where(
      and(
        eq(integrationEvents.integrationId, integrationId),
        gte(integrationEvents.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      )
    );

  if (recentEvents.length === 0) return baseline;

  const uniqueEndpoints = [...new Set(recentEvents.map((e) => e.path))];
  const uniqueCategories = [...new Set(recentEvents.map((e) => e.dataCategory).filter(Boolean))];
  const uniqueMethods = [...new Set(recentEvents.map((e) => e.method))];
  const uniqueIps = [...new Set(recentEvents.map((e) => e.sourceIp).filter(Boolean))];

  const avgRequestsPerHour = Math.round(recentEvents.length / (7 * 24));
  const avgRecords = Math.round(
    recentEvents.reduce((sum, e) => sum + (e.recordsAccessed || 0), 0) / recentEvents.length
  );

  const [updated] = await db
    .update(integrationBaselines)
    .set({
      avgRequestsPerHour: avgRequestsPerHour || baseline.avgRequestsPerHour,
      avgRequestsPerMinute: Math.round(avgRequestsPerHour / 60) || baseline.avgRequestsPerMinute,
      avgRecordsPerRequest: avgRecords || baseline.avgRecordsPerRequest,
      normalEndpoints: uniqueEndpoints,
      normalDataCategories: uniqueCategories,
      normalHttpMethods: uniqueMethods,
      normalSourceIps: uniqueIps,
      totalRequests: recentEvents.length,
      lastCalculatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(integrationBaselines.integrationId, integrationId))
    .returning();

  return updated;
}

export async function getBaselineStats(integrationId) {
  const baseline = await getOrCreateBaseline(integrationId);

  // Count events in last hour
  const oneHourAgo = new Date(Date.now() - 3600 * 1000);
  const recentCount = await db
    .select({ count: integrationEvents.id })
    .from(integrationEvents)
    .where(
      and(
        eq(integrationEvents.integrationId, integrationId),
        gte(integrationEvents.createdAt, oneHourAgo)
      )
    );

  return {
    baseline,
    requestsLastHour: recentCount.length,
  };
}
