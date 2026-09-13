import { eq } from "drizzle-orm";
import db from "../db/index.js";
import { auditLogs } from "../db/schema.js";

export async function createAuditLog({ userId, action, resourceType, resourceId, metadata, ipAddress }) {
  const [log] = await db
    .insert(auditLogs)
    .values({ userId, action, resourceType, resourceId, metadata, ipAddress })
    .returning();

  return log;
}

export async function getAuditLogs({ userId, action, resourceType, limit = 100 } = {}) {
  let query = db.select().from(auditLogs);

  if (userId) query = query.where(eq(auditLogs.userId, userId));
  if (action) query = query.where(eq(auditLogs.action, action));
  if (resourceType) query = query.where(eq(auditLogs.resourceType, resourceType));

  return query.orderBy(auditLogs.createdAt).limit(limit);
}
