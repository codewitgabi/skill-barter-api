import { validateRequest } from "../middlewares/validation.middleware";
import { query, body, param } from "express-validator";
import { DayOfWeek } from "../models/sessionBooking.model";

export const GetSessionBookingsSchema = [
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
  validateRequest,
];

export const SessionBookingIdSchema = [
  param("id")
    .notEmpty()
    .withMessage("Session booking ID is required")
    .isMongoId()
    .withMessage("Session booking ID must be a valid MongoDB ID"),
  validateRequest,
];

export const UpdateSessionBookingSchema = [
  body("daysPerWeek")
    .optional()
    .isInt({ min: 1, max: 7 })
    .withMessage("Days per week must be between 1 and 7")
    .toInt(),
  body("daysOfWeek")
    .optional()
    .isArray()
    .withMessage("Days of week must be an array")
    .custom((days) => {
      const validDays = Object.values(DayOfWeek);
      if (days.length === 0 || days.length > 7) {
        throw new Error("Days of week must have between 1 and 7 days");
      }
      const uniqueDays = new Set(days);
      if (uniqueDays.size !== days.length) {
        throw new Error("Days of week must not contain duplicates");
      }
      if (!days.every((day: string) => validDays.includes(day as DayOfWeek))) {
        throw new Error(
          `Days of week must be valid day names: ${validDays.join(", ")}`,
        );
      }
      return true;
    }),
  body("startTime")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Start time must be in HH:MM format (24-hour)"),
  body("duration")
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage("Duration must be between 15 and 480 minutes")
    .toInt(),
  body("totalSessions")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Total sessions must be between 1 and 1000")
    .toInt(),
  body("message")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Message cannot exceed 500 characters"),
  validateRequest,
];
