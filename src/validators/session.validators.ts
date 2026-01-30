import { validateRequest } from "../middlewares/validation.middleware";
import { query, param } from "express-validator";
import { SessionStatus } from "../models/session.model";

export const GetSessionsSchema = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),
  query("status")
    .optional()
    .isIn(Object.values(SessionStatus))
    .withMessage(
      `Status must be one of: ${Object.values(SessionStatus).join(", ")}`,
    ),
  validateRequest,
];

export const SessionIdParamSchema = [
  param("sessionId")
    .notEmpty()
    .withMessage("Session ID is required")
    .isMongoId()
    .withMessage("Invalid session ID format"),
  validateRequest,
];
