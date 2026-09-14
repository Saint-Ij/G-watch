import { Router } from "express";
import { z } from "zod";
import { create, list, update, remove } from "../controllers/resource.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const createResourceSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.string().min(1).max(255),
  sensitivity: z.enum(["public", "internal", "confidential", "restricted"]),
  description: z.string().max(500).optional(),
});

const updateResourceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: z.string().min(1).max(255).optional(),
  sensitivity: z.enum(["public", "internal", "confidential", "restricted"]).optional(),
  description: z.string().max(500).optional(),
});

router.post("/", authenticate, authorize("admin"), validate(createResourceSchema), create);
router.get("/", authenticate, list);
router.patch("/:id", authenticate, authorize("admin"), validate(updateResourceSchema), update);
router.delete("/:id", authenticate, authorize("admin"), remove);

export default router;
