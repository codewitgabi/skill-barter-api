import { Router } from "express";
import { getConnections } from "../controllers/connection.controller";
import { GetConnectionsSchema } from "../validators/connection.validators";

const router = Router();

// GET /api/v1/connections - Get list of connections (authentication optional)
router.get("/", GetConnectionsSchema, getConnections);

export default router;
