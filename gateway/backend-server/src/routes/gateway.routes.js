import { Router } from "express";
import { handleGatewayRequest } from "../controllers/gateway.controller.js";
import { identifyIntegration, validateIntegrationCredential, checkRateLimit } from "../middleware/gateway.js";

const router = Router();

router.all(
  "/*splat",
  identifyIntegration,
  validateIntegrationCredential,
  checkRateLimit,
  handleGatewayRequest
);

export default router;
