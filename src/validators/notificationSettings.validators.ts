import { validateRequest } from "../middlewares/validation.middleware";
import { body } from "express-validator";

export const UpdateNotificationSettingsSchema = [
  // Email settings
  body("email").optional().isObject().withMessage("Email must be an object"),
  body("email.exchangeRequests")
    .optional()
    .isBoolean()
    .withMessage("email.exchangeRequests must be a boolean"),
  body("email.sessionReminders")
    .optional()
    .isBoolean()
    .withMessage("email.sessionReminders must be a boolean"),
  body("email.messages")
    .optional()
    .isBoolean()
    .withMessage("email.messages must be a boolean"),
  body("email.reviewsAndRatings")
    .optional()
    .isBoolean()
    .withMessage("email.reviewsAndRatings must be a boolean"),
  body("email.achievements")
    .optional()
    .isBoolean()
    .withMessage("email.achievements must be a boolean"),
  body("email.securityAlerts")
    .optional()
    .isBoolean()
    .withMessage("email.securityAlerts must be a boolean"),

  // Push settings
  body("push").optional().isObject().withMessage("Push must be an object"),
  body("push.exchangeRequests")
    .optional()
    .isBoolean()
    .withMessage("push.exchangeRequests must be a boolean"),
  body("push.sessionReminders")
    .optional()
    .isBoolean()
    .withMessage("push.sessionReminders must be a boolean"),
  body("push.messages")
    .optional()
    .isBoolean()
    .withMessage("push.messages must be a boolean"),
  body("push.reviewsAndRatings")
    .optional()
    .isBoolean()
    .withMessage("push.reviewsAndRatings must be a boolean"),
  body("push.achievements")
    .optional()
    .isBoolean()
    .withMessage("push.achievements must be a boolean"),

  // In-app settings
  body("inApp").optional().isObject().withMessage("InApp must be an object"),
  body("inApp.exchangeRequests")
    .optional()
    .isBoolean()
    .withMessage("inApp.exchangeRequests must be a boolean"),
  body("inApp.sessionReminders")
    .optional()
    .isBoolean()
    .withMessage("inApp.sessionReminders must be a boolean"),
  body("inApp.messages")
    .optional()
    .isBoolean()
    .withMessage("inApp.messages must be a boolean"),
  body("inApp.reviewsAndRatings")
    .optional()
    .isBoolean()
    .withMessage("inApp.reviewsAndRatings must be a boolean"),
  body("inApp.achievements")
    .optional()
    .isBoolean()
    .withMessage("inApp.achievements must be a boolean"),

  validateRequest,
];
