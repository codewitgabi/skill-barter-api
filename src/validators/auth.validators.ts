import { validateRequest } from "../middlewares/validation.middleware";
import { body } from "express-validator";
import { DifficultyLevel } from "../models/skillToTeach.model";

export const EmailVerificationSchema = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .toLowerCase(),
  validateRequest,
];

export const VerifyOTPSchema = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .toLowerCase(),
  body("otp")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .isNumeric()
    .withMessage("OTP must contain only numbers"),
  validateRequest,
];

export const RegisterSchema = [
  body("first_name")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 1, max: 50 })
    .withMessage("First name must be between 1 and 50 characters"),
  body("last_name")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 1, max: 50 })
    .withMessage("Last name must be between 1 and 50 characters"),
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .toLowerCase(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    ),
  body("skillsToTeach")
    .optional()
    .isArray()
    .withMessage("skillsToTeach must be an array"),
  body("skillsToTeach.*.name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Skill name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Skill name must be between 1 and 100 characters"),
  body("skillsToTeach.*.difficulty")
    .optional()
    .isIn(Object.values(DifficultyLevel))
    .withMessage("Difficulty must be one of: beginner, intermediate, advanced"),
  body("skillsToLearn")
    .optional()
    .isArray()
    .withMessage("skillsToLearn must be an array"),
  body("skillsToLearn.*.name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Skill name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Skill name must be between 1 and 100 characters"),
  body("skillsToLearn.*.difficulty")
    .optional()
    .isIn(Object.values(DifficultyLevel))
    .withMessage("Difficulty must be one of: beginner, intermediate, advanced"),
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
  body("profile_picture")
    .optional()
    .isURL()
    .withMessage("Profile picture must be a valid URL"),
  body("weekly_availability")
    .optional()
    .isInt({ min: 0, max: 168 })
    .withMessage("Weekly availability must be between 0 and 168 hours"),
  validateRequest,
];

export const LoginSchema = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .toLowerCase(),
  body("password").notEmpty().withMessage("Password is required"),
  validateRequest,
];

export const RefreshTokenSchema = [
  body("refreshToken").notEmpty().withMessage("Refresh token is required"),
  validateRequest,
];

export const LogoutSchema = [
  body("refreshToken")
    .optional()
    .notEmpty()
    .withMessage("Refresh token cannot be empty if provided"),
  validateRequest,
];

export const ForgotPasswordSchema = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .toLowerCase(),
  validateRequest,
];

export const VerifyPasswordResetOTPSchema = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .toLowerCase(),
  body("otp")
    .isLength({ min: 5, max: 5 })
    .withMessage("OTP must be 5 digits")
    .isNumeric()
    .withMessage("OTP must contain only numbers"),
  validateRequest,
];

export const ResetPasswordSchema = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .toLowerCase(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    ),
  validateRequest,
];
