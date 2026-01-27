import { Router } from "express";
import { getStats } from "../controllers/stats.controller";

const router = Router();

router.get("/community-highlights", getStats);

export default router;
