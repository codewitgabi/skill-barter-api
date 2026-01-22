import { Request, Response } from "express";
import catchAsync from "../utils/catch-async";
import notificationSettingsService from "../services/notificationSettings.service";

export const getNotificationSettings = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const response =
      await notificationSettingsService.getNotificationSettings(userId);

    return res.status(response.httpStatus).json(response);
  },
);

export const updateNotificationSettings = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const response =
      await notificationSettingsService.updateNotificationSettings(
        userId,
        req.body,
      );

    return res.status(response.httpStatus).json(response);
  },
);
