import { Router } from "express";
import { list } from "../controllers/audit.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, authorize("admin"), list);

export default router;
