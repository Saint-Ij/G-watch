import { Router } from "express";
import { overview, activity, risk, dataAccess, integrationDetail } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/overview", authenticate, overview);
router.get("/activity", authenticate, activity);
router.get("/risk", authenticate, risk);
router.get("/data-access", authenticate, dataAccess);
router.get("/integrations/:id", authenticate, integrationDetail);

export default router;
