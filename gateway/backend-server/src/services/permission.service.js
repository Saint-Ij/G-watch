import { eq, and } from "drizzle-orm";
import db from "../db/index.js";
import { integrationPermissions, dataResources } from "../db/schema.js";

export async function setPermission({ integrationId, resourceId, action, allowed, maxRecordsPerRequest, maxRecordsPerHour }) {
  // Check existing
  const [existing] = await db
    .select()
    .from(integrationPermissions)
    .where(
      and(
        eq(integrationPermissions.integrationId, integrationId),
        eq(integrationPermissions.resourceId, resourceId),
        eq(integrationPermissions.action, action)
      )
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(integrationPermissions)
      .set({ allowed, maxRecordsPerRequest, maxRecordsPerHour })
      .where(eq(integrationPermissions.id, existing.id))
      .returning();
    return updated;
  }

  const [perm] = await db
    .insert(integrationPermissions)
    .values({
      integrationId,
      resourceId,
      action,
      allowed,
      maxRecordsPerRequest,
      maxRecordsPerHour,
    })
    .returning();

  return perm;
}

export async function getPermissions(integrationId) {
  return db
    .select({
      id: integrationPermissions.id,
      resourceId: integrationPermissions.resourceId,
      action: integrationPermissions.action,
      allowed: integrationPermissions.allowed,
      maxRecordsPerRequest: integrationPermissions.maxRecordsPerRequest,
      maxRecordsPerHour: integrationPermissions.maxRecordsPerHour,
      resourceName: dataResources.name,
      category: dataResources.category,
      sensitivity: dataResources.sensitivity,
    })
    .from(integrationPermissions)
    .innerJoin(dataResources, eq(integrationPermissions.resourceId, dataResources.id))
    .where(eq(integrationPermissions.integrationId, integrationId));
}

export async function checkPermission(integrationId, resourceName, action) {
  const [resource] = await db
    .select()
    .from(dataResources)
    .where(eq(dataResources.name, resourceName))
    .limit(1);

  if (!resource) {
    return { allowed: false, permission: null, resource: null };
  }

  const [permission] = await db
    .select()
    .from(integrationPermissions)
    .where(
      and(
        eq(integrationPermissions.integrationId, integrationId),
        eq(integrationPermissions.resourceId, resource.id),
        eq(integrationPermissions.action, action)
      )
    )
    .limit(1);

  return {
    allowed: permission ? permission.allowed : false,
    permission: permission || null,
    resource,
  };
}

export async function deletePermission(permissionId) {
  await db.delete(integrationPermissions).where(eq(integrationPermissions.id, permissionId));
  return { message: "Permission deleted" };
}
