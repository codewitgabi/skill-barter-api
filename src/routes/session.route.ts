import { Router } from "express";
import { getSessions } from "../controllers/session.controller";
import { GetSessionsSchema } from "../validators/session.validators";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", GetSessionsSchema, getSessions);

export default router;
