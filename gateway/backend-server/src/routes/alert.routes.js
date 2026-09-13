import { Router } from "express";
import { list, getById, update, acknowledge, resolve } from "../controllers/alert.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, list);
router.get("/:id", authenticate, getById);
router.patch("/:id", authenticate, authorize("admin", "analyst"), update);
router.post("/:id/acknowledge", authenticate, authorize("admin", "analyst"), acknowledge);
router.post("/:id/resolve", authenticate, authorize("admin", "analyst"), resolve);

export default router;
