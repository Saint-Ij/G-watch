import { eq, and, gt } from "drizzle-orm";
import db from "../db/index.js";
import { integrationCredentials } from "../db/schema.js";

// Simple in-memory rate limiter per integration
const rateLimits = new Map();

const CLEANUP_INTERVAL = 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimits) {
    data.entries = data.entries.filter((t) => now - t < 60 * 60 * 1000);
    if (data.entries.length === 0) {
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

  // Look up active credentials and compare
  const activeCredentials = await db
    .select()
    .from(integrationCredentials)
    .where(
      and(
        eq(integrationCredentials.status, "active"),
        eq(integrationCredentials.type, authMethod)
      )
    );

  for (const cred of activeCredentials) {
    // In production you'd compare hashes; here we do a simple string match for dev simplicity
    if (cred.credentialHash === providedKey) {
      req.integrationContext.identified = true;
      req.integrationContext.integrationId = cred.integrationId;
      req.integrationContext.credentialId = cred.id;

      // Update lastUsedAt
      await db
        .update(integrationCredentials)
        .set({ lastUsedAt: new Date() })
        .where(eq(integrationCredentials.id, cred.id));

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
