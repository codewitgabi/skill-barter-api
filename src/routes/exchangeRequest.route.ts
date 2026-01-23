import { Router } from "express";
import {
  createExchangeRequest,
  getExchangeRequests,
} from "../controllers/exchangeRequest.controller";
import {
  CreateExchangeRequestSchema,
  GetExchangeRequestsSchema,
} from "../validators/exchangeRequest.validators";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// All exchange request routes require authentication
router.use(authenticate);

router.post("/", CreateExchangeRequestSchema, createExchangeRequest);
router.get("/", GetExchangeRequestsSchema, getExchangeRequests);

export default router;
