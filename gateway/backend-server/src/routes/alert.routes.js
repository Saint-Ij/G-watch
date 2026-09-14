import { Router } from "express";
import { list, getById, update, acknowledge, resolve, review } from "../controllers/alert.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, list);
router.get("/:id", authenticate, getById);
router.patch("/:id", authenticate, authorize("admin"), update);
router.post("/:id/acknowledge", authenticate, authorize("admin"), acknowledge);
router.post("/:id/resolve", authenticate, authorize("admin"), resolve);
router.post("/:id/review", authenticate, authorize("admin"), review);

export default router;
