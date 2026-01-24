import { Router } from "express";
import { getConnections } from "../controllers/connection.controller";
import { GetConnectionsSchema } from "../validators/connection.validators";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);
router.get("/", GetConnectionsSchema, getConnections);

export default router;
