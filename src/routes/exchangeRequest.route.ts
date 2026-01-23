import { Router } from "express";
import {
  createExchangeRequest,
  getExchangeRequests,
  acceptExchangeRequest,
  declineExchangeRequest,
} from "../controllers/exchangeRequest.controller";
import {
  CreateExchangeRequestSchema,
  GetExchangeRequestsSchema,
  ExchangeRequestIdSchema,
} from "../validators/exchangeRequest.validators";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// All exchange request routes require authentication
router.use(authenticate);

router.post("/", CreateExchangeRequestSchema, createExchangeRequest);
router.get("/", GetExchangeRequestsSchema, getExchangeRequests);
router.patch("/:id/accept", ExchangeRequestIdSchema, acceptExchangeRequest);
router.patch("/:id/decline", ExchangeRequestIdSchema, declineExchangeRequest);

export default router;
