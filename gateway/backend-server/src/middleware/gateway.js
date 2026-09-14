import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import db from "../db/index.js";
import { integrationCredentials } from "../db/schema.js";

// Simple in-memory rate limiter per integration
const rateLimits = new Map();

// Credential lookup cache: Maps sha256(credential) -> credential record
// Populated lazily on first request per credential type, refreshed periodically
const credentialLookup = new Map();
let lastCacheRefresh = 0;
const CACHE_TTL = 60 * 1000; // refresh every 60 seconds

function hashCredential(credential) {
  return crypto.createHash("sha256").update(credential).digest("hex");
}

async function refreshCredentialCache() {
  const activeCredentials = await db
    .select()
    .from(integrationCredentials)
    .where(eq(integrationCredentials.status, "active"));

  credentialLookup.clear();
  for (const cred of activeCredentials) {
    // Store by type + hash-of-hash for lookup
    // We can't reverse bcrypt, so we store the record and compare via bcrypt on match
    const key = cred.type;
    if (!credentialLookup.has(key)) {
      credentialLookup.set(key, []);
    }
    credentialLookup.get(key).push(cred);
  }
  lastCacheRefresh = Date.now();
}

const CLEANUP_INTERVAL = 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimits) {
    data.minuteEntries = data.minuteEntries.filter((t) => now - t < 60 * 1000);
    data.hourEntries = data.hourEntries.filter((t) => now - t < 3600 * 1000);
    if (data.minuteEntries.length === 0 && data.hourEntries.length === 0) {
      rateLimits.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

export function identifyIntegration(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  const bearerToken = req.headers.authorization?.split(" ")[1];

  req.integrationContext = {
    identified: false,
    integrationId: null,
    credentialId: null,
    authMethod: null,
  };

  if (apiKey) {
    req.integrationContext.authMethod = "api_key";
    req.integrationContext.providedKey = apiKey;
  } else if (bearerToken) {
    req.integrationContext.authMethod = "bearer_token";
    req.integrationContext.providedKey = bearerToken;
  }

  next();
}

export async function validateIntegrationCredential(req, res, next) {
  const { providedKey, authMethod } = req.integrationContext;
  if (!providedKey) {
    return res.status(401).json({ error: "No credentials provided" });
  }

  // Refresh cache if stale
  if (Date.now() - lastCacheRefresh > CACHE_TTL || credentialLookup.size === 0) {
    await refreshCredentialCache();
  }

  // Look up credentials by type (indexed filter)
  const candidates = credentialLookup.get(authMethod) || [];

  for (const cred of candidates) {
    const matches = await bcrypt.compare(providedKey, cred.credentialHash);
    if (matches) {
      req.integrationContext.identified = true;
      req.integrationContext.integrationId = cred.integrationId;
      req.integrationContext.credentialId = cred.id;

      // Update lastUsedAt (fire and forget)
      db.update(integrationCredentials)
        .set({ lastUsedAt: new Date() })
        .where(eq(integrationCredentials.id, cred.id))
        .catch(() => {});

      return next();
    }
  }

  return res.status(401).json({ error: "Invalid credentials" });
}

export function checkRateLimit(req, res, next) {
  const integrationId = req.integrationContext.integrationId;
  if (!integrationId) return next();

  const now = Date.now();
  const key = integrationId;

  if (!rateLimits.has(key)) {
    rateLimits.set(key, { minuteEntries: [], hourEntries: [] });
  }

  const data = rateLimits.get(key);

  // Clean old entries
  data.minuteEntries = data.minuteEntries.filter((t) => now - t < 60 * 1000);
  data.hourEntries = data.hourEntries.filter((t) => now - t < 3600 * 1000);

  if (data.minuteEntries.length >= 100) {
    return res.status(429).json({
      error: "Rate limit exceeded",
      limit: "100 requests per minute",
      retryAfter: Math.ceil((data.minuteEntries[0] + 60000 - now) / 1000),
    });
  }

  if (data.hourEntries.length >= 1000) {
    return res.status(429).json({
      error: "Rate limit exceeded",
      limit: "1000 requests per hour",
      retryAfter: Math.ceil((data.hourEntries[0] + 3600000 - now) / 1000),
    });
  }

  data.minuteEntries.push(now);
  data.hourEntries.push(now);

  next();
}

export function getRateLimitStatus(integrationId) {
  const data = rateLimits.get(integrationId);
  if (!data) return { minuteCount: 0, hourCount: 0 };
  const now = Date.now();
  const minuteCount = data.minuteEntries.filter((t) => now - t < 60000).length;
  const hourCount = data.hourEntries.filter((t) => now - t < 3600000).length;
  return { minuteCount, hourCount };
}
