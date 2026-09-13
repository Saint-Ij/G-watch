import { eq } from "drizzle-orm";
import db from "../db/index.js";
import { integrations } from "../db/schema.js";
import { slugify } from "../utils/helpers.js";

export async function createIntegration({ name, description }) {
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
    .values({ name, slug, description })
    .returning();

  return integration;
}

export async function getIntegrations() {
  return db.select().from(integrations).orderBy(integrations.createdAt);
}

export async function getIntegrationById(id) {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, id))
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

export async function updateIntegration(id, updates) {
  const [existing] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, id))
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

export async function deleteIntegration(id) {
  const [existing] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.id, id))
    .limit(1);

  if (!existing) {
    throw new Error("Integration not found");
  }

  await db.delete(integrations).where(eq(integrations.id, id));
  return existing;
}
