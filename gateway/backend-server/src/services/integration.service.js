import { eq, and, desc } from "drizzle-orm";
import db from "../db/index.js";
import { integrations } from "../db/schema.js";
import { slugify } from "../utils/helpers.js";

export async function createIntegration({ name, description, targetUrl, ownerId }) {
  const slug = slugify(name);

  const existing = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(eq(integrations.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Integration with this name already exists");
  }

  const [integration] = await db
    .insert(integrations)
    .values({ name, slug, description, targetUrl, ownerId })
    .returning();

  return integration;
}

export async function getIntegrations(userId, isAdmin) {
  if (isAdmin) {
    return db.select().from(integrations).orderBy(desc(integrations.createdAt));
  }
  return db
    .select()
    .from(integrations)
    .where(eq(integrations.ownerId, userId))
    .orderBy(desc(integrations.createdAt));
}

export async function getIntegrationById(id, userId, isAdmin) {
  const conditions = [eq(integrations.id, id)];
  if (!isAdmin && userId) {
    conditions.push(eq(integrations.ownerId, userId));
  }

  const [integration] = await db
    .select()
    .from(integrations)
    .where(and(...conditions))
    .limit(1);

  if (!integration) {
    throw new Error("Integration not found");
  }

  return integration;
}

export async function getIntegrationBySlug(slug) {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.slug, slug))
    .limit(1);

  return integration || null;
}

export async function updateIntegration(id, updates, userId, isAdmin) {
  const conditions = [eq(integrations.id, id)];
  if (!isAdmin && userId) {
    conditions.push(eq(integrations.ownerId, userId));
  }

  const [existing] = await db
    .select()
    .from(integrations)
    .where(and(...conditions))
    .limit(1);

  if (!existing) {
    throw new Error("Integration not found");
  }

  const [updated] = await db
    .update(integrations)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(integrations.id, id))
    .returning();

  return updated;
}

export async function deleteIntegration(id, userId, isAdmin) {
  const conditions = [eq(integrations.id, id)];
  if (!isAdmin && userId) {
    conditions.push(eq(integrations.ownerId, userId));
  }

  const [existing] = await db
    .select()
    .from(integrations)
    .where(and(...conditions))
    .limit(1);

  if (!existing) {
    throw new Error("Integration not found");
  }

  await db.delete(integrations).where(eq(integrations.id, id));
  return existing;
}
