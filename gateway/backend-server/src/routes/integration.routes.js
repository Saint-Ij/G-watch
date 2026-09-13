import { Router } from "express";
import {
  create,
  list,
  getById,
  update,
  remove,
  createCredential,
  listCredentials,
  deleteCredential,
  setPermission,
  listPermissions,
  deletePermission,
  getDataAccess,
} from "../controllers/integration.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { z } from "zod";

const router = Router();

const createIntegrationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const updateIntegrationSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["active", "suspended", "disabled"]).optional(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
});

const createCredentialSchema = z.object({
  type: z.enum(["api_key", "bearer_token", "webhook_signature"]),
  name: z.string().min(1),
  credential: z.string().min(1),
});

const setPermissionSchema = z.object({
  resourceId: z.string().uuid(),
  action: z.enum(["read", "write", "delete"]),
  allowed: z.boolean(),
  maxRecordsPerRequest: z.number().int().positive().optional(),
  maxRecordsPerHour: z.number().int().positive().optional(),
});

// Integrations
router.post("/", authenticate, authorize("admin", "analyst"), validate(createIntegrationSchema), create);
router.get("/", authenticate, list);
router.get("/:id", authenticate, getById);
router.patch("/:id", authenticate, authorize("admin", "analyst"), validate(updateIntegrationSchema), update);
router.delete("/:id", authenticate, authorize("admin"), remove);

// Credentials
router.post("/:id/credentials", authenticate, authorize("admin", "analyst"), validate(createCredentialSchema), createCredential);
router.get("/:id/credentials", authenticate, listCredentials);
router.delete("/:id/credentials/:credentialId", authenticate, authorize("admin"), deleteCredential);

// Permissions
router.post("/:id/permissions", authenticate, authorize("admin", "analyst"), validate(setPermissionSchema), setPermission);
router.get("/:id/permissions", authenticate, listPermissions);
router.delete("/:id/permissions/:permissionId", authenticate, authorize("admin"), deletePermission);

// Data access
router.get("/:id/data-access", authenticate, getDataAccess);

export default router;
