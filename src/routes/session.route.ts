import { Router } from "express";
import {
  getSessions,
  completeSession,
  getLearningProgress,
} from "../controllers/session.controller";
import {
  GetSessionsSchema,
  SessionIdParamSchema,
} from "../validators/session.validators";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", GetSessionsSchema, getSessions);
router.get("/learning-progress", getLearningProgress);
router.post("/:sessionId/complete", SessionIdParamSchema, completeSession);

export default router;
