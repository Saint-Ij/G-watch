import { Router } from "express";
import { handleTransparentProxy } from "../controllers/transparent.controller.js";
import { identifyIntegration, validateIntegrationCredential, checkRateLimit } from "../middleware/gateway.js";

const router = Router();

/**
 * Transparent proxy route.
 *
 * Catches ALL requests (GET, POST, PUT, PATCH, DELETE, etc.) that weren't
 * matched by other routes (/api/*, /gateway/*, /health, etc.).
 *
 * Third parties call this as if it were the real backend:
 *   GET    https://gwatch.example.com/customers/123
 *   POST   https://gwatch.example.com/orders
 *   DELETE https://gwatch.example.com/orders/456
 *
 * Authentication: X-API-Key header (same as /gateway/*)
 *
 * Flow:
 *   1. Identify integration from API key
 *   2. Validate credential
 *   3. Check rate limits
 *   4. Run anomaly detection + risk scoring
 *   5. If allowed → proxy to integration.targetUrl
 *   6. Return real backend response
 */
router.all(
  "/*splat",
  identifyIntegration,
  validateIntegrationCredential,
  checkRateLimit,
  handleTransparentProxy
);

export default router;
