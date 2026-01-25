import { validateRequest } from "../middlewares/validation.middleware";
import { query } from "express-validator";
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
