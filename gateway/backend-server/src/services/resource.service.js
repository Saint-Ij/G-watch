import { eq } from "drizzle-orm";
import db from "../db/index.js";
import { dataResources } from "../db/schema.js";

export async function createResource({ name, category, sensitivity, description }) {
  const [resource] = await db
    .insert(dataResources)
    .values({ name, category, sensitivity, description })
    .returning();
  return resource;
}

export async function getResources() {
  return db.select().from(dataResources);
}

export async function getResourceById(id) {
  const [resource] = await db
    .select()
    .from(dataResources)
    .where(eq(dataResources.id, id))
    .limit(1);
  return resource || null;
}

export async function getResourceByName(name) {
  const [resource] = await db
    .select()
    .from(dataResources)
    .where(eq(dataResources.name, name))
    .limit(1);
  return resource || null;
}

export async function updateResource(id, { name, category, sensitivity, description }) {
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (category !== undefined) updates.category = category;
  if (sensitivity !== undefined) updates.sensitivity = sensitivity;
  if (description !== undefined) updates.description = description;

  const [resource] = await db
    .update(dataResources)
    .set(updates)
    .where(eq(dataResources.id, id))
    .returning();
  return resource || null;
}

export async function deleteResource(id) {
  const [deleted] = await db
    .delete(dataResources)
    .where(eq(dataResources.id, id))
    .returning();
  return deleted || null;
}
