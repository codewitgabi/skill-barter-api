import { validateRequest } from "../middlewares/validation.middleware";
import { body } from "express-validator";

export const UpdateUserSchema = [
  body("first_name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("First name cannot be empty")
    .isLength({ min: 1, max: 50 })
    .withMessage("First name must be between 1 and 50 characters"),
  body("last_name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Last name cannot be empty")
    .isLength({ min: 1, max: 50 })
    .withMessage("Last name must be between 1 and 50 characters"),
  body("username")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Username cannot be empty")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-z0-9_]+$/)
    .withMessage(
      "Username can only contain lowercase letters, numbers, and underscores",
    )
    .toLowerCase(),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .toLowerCase(),
  body("about")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("About section cannot exceed 1000 characters"),
  body("city")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("City name cannot exceed 100 characters"),
  body("country")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Country name cannot exceed 100 characters"),
  body("website")
    .optional()
    .trim()
    .custom((value) => {
      if (value === "" || value === null || value === undefined) {
        return true; // Allow empty/null values to clear the website
      }
      // Validate URL format
      if (!/^https?:\/\/.+/.test(value)) {
        throw new Error("Website must start with http:// or https://");
      }
      return true;
    })
    .withMessage(
      "Website must be a valid URL (must start with http:// or https://)",
    ),
  body("skills")
    .optional()
    .isArray()
    .withMessage("Skills must be an array")
    .custom((skills: string[]) => {
      if (skills.length > 50) {
        throw new Error("Cannot have more than 50 skills");
      }
      return true;
    }),
  body("skills.*")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Skill cannot be empty")
    .isLength({ min: 1, max: 100 })
    .withMessage("Each skill must be between 1 and 100 characters"),
  body("interests")
    .optional()
    .isArray()
    .withMessage("Interests must be an array")
    .custom((interests: string[]) => {
      if (interests.length > 50) {
        throw new Error("Cannot have more than 50 interests");
      }
      return true;
    }),
  body("interests.*")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Interest cannot be empty")
    .isLength({ min: 1, max: 100 })
    .withMessage("Each interest must be between 1 and 100 characters"),
  body("language")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Language cannot exceed 50 characters"),
  body("timezone")
    .optional()
    .trim()
    .matches(/^[A-Za-z_]+\/[A-Za-z_]+$/)
    .withMessage("Please provide a valid timezone (e.g., America/New_York)"),
  validateRequest,
];
