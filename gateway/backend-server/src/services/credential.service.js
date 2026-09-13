import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import db from "../db/index.js";
import { integrationCredentials } from "../db/schema.js";

export async function createCredential({ integrationId, type, name, credential }) {
  const credentialHash = await bcrypt.hash(credential, 10);

  const [cred] = await db
    .insert(integrationCredentials)
    .values({
      integrationId,
      type,
      name,
      credentialHash,
    })
    .returning({
      id: integrationCredentials.id,
      type: integrationCredentials.type,
      name: integrationCredentials.name,
      status: integrationCredentials.status,
      createdAt: integrationCredentials.createdAt,
      expiresAt: integrationCredentials.expiresAt,
    });

  return cred;
}

export async function getCredentials(integrationId) {
  return db
    .select({
      id: integrationCredentials.id,
      type: integrationCredentials.type,
      name: integrationCredentials.name,
      status: integrationCredentials.status,
      createdAt: integrationCredentials.createdAt,
      expiresAt: integrationCredentials.expiresAt,
      lastUsedAt: integrationCredentials.lastUsedAt,
    })
    .from(integrationCredentials)
    .where(eq(integrationCredentials.integrationId, integrationId));
}

export async function deleteCredential(integrationId, credentialId) {
  const [existing] = await db
    .select()
    .from(integrationCredentials)
    .where(
      and(
        eq(integrationCredentials.id, credentialId),
        eq(integrationCredentials.integrationId, integrationId)
      )
    )
    .limit(1);

  if (!existing) {
    throw new Error("Credential not found");
  }

  await db
    .update(integrationCredentials)
    .set({ status: "revoked" })
    .where(eq(integrationCredentials.id, credentialId));

  return { message: "Credential revoked" };
}

export async function rotateCredential(integrationId, credentialId, newCredential) {
  const [existing] = await db
    .select()
    .from(integrationCredentials)
    .where(
      and(
        eq(integrationCredentials.id, credentialId),
        eq(integrationCredentials.integrationId, integrationId)
      )
    )
    .limit(1);

  if (!existing) {
    throw new Error("Credential not found");
  }

  // Revoke old
  await db
    .update(integrationCredentials)
    .set({ status: "revoked" })
    .where(eq(integrationCredentials.id, credentialId));

  // Create new
  const credentialHash = await bcrypt.hash(newCredential, 10);
  const [newCred] = await db
    .insert(integrationCredentials)
    .values({
      integrationId,
      type: existing.type,
      name: `${existing.name} (rotated)`,
      credentialHash,
    })
    .returning({
      id: integrationCredentials.id,
      type: integrationCredentials.type,
      name: integrationCredentials.name,
      status: integrationCredentials.status,
      createdAt: integrationCredentials.createdAt,
    });

  return newCred;
}
