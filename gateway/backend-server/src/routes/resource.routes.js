import { Router } from "express";
import { create, list } from "../controllers/resource.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.post("/", authenticate, authorize("admin"), create);
router.get("/", authenticate, list);

export default router;
