import { validateRequest } from "../middlewares/validation.middleware";
import { body, query } from "express-validator";
import { ExchangeRequestStatus } from "../models/exchangeRequest.model";

export const CreateExchangeRequestSchema = [
  body("receiverId")
    .notEmpty()
    .withMessage("Receiver ID is required")
    .isMongoId()
    .withMessage("Receiver ID must be a valid MongoDB ID"),
  body("message")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Message cannot exceed 500 characters"),
  body("teachingSkill")
    .trim()
    .notEmpty()
    .withMessage("Teaching skill is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Teaching skill must be between 1 and 100 characters"),
  body("learningSkill")
    .trim()
    .notEmpty()
    .withMessage("Learning skill is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Learning skill must be between 1 and 100 characters"),
  validateRequest,
];

export const GetExchangeRequestsSchema = [
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
    .isIn(Object.values(ExchangeRequestStatus))
    .withMessage(
      `Status must be one of: ${Object.values(ExchangeRequestStatus).join(", ")}`,
    ),
  validateRequest,
];
