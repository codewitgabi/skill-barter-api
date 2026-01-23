import { Router } from "express";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "../controllers/notificationSettings.controller";
import { UpdateNotificationSettingsSchema } from "../validators/notificationSettings.validators";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// All notification settings routes require authentication
router.use(authenticate);

router.get("/", getNotificationSettings);
router.patch("/", UpdateNotificationSettingsSchema, updateNotificationSettings);

export default router;
