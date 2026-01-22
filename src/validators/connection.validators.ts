import { validateRequest } from "../middlewares/validation.middleware";
import { query } from "express-validator";

export const GetConnectionsSchema = [
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
  query("search")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters"),
  query("skill")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Skill filter must be between 1 and 100 characters"),
  query("location")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Location filter must be between 1 and 100 characters"),
  validateRequest,
];
