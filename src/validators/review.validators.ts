import { validateRequest } from "../middlewares/validation.middleware";
import { body } from "express-validator";

export const CreateReviewSchema = [
  body("skill")
    .trim()
    .notEmpty()
    .withMessage("Skill is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Skill must be between 1 and 100 characters"),
  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be an integer between 1 and 5"),
  body("comment")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Comment cannot exceed 1000 characters"),
  validateRequest,
];
