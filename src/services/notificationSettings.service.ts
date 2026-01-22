import NotificationSettings, {
  INotificationSettings,
  IEmailSettings,
  IPushSettings,
  IInAppSettings,
} from "../models/notificationSettings.model";
import { NotFoundError } from "../utils/api.errors";
import { SuccessResponse } from "../utils/responses";
import { StatusCodes } from "http-status-codes";

interface UpdateNotificationSettingsData {
  email?: Partial<IEmailSettings>;
  push?: Partial<IPushSettings>;
  inApp?: Partial<IInAppSettings>;
}

class NotificationSettingsService {
  async getNotificationSettings(userId: string) {
    const settings = await NotificationSettings.findOne({ user: userId });

    if (!settings) {
      throw new NotFoundError("Notification settings not found");
    }

    const settingsData = settings.toObject();

    return SuccessResponse({
      message: "Notification settings retrieved successfully",
      data: {
        email: settingsData.email,
        push: settingsData.push,
        inApp: settingsData.inApp,
      },
      httpStatus: StatusCodes.OK,
    });
  }

  async updateNotificationSettings(
    userId: string,
    updateData: UpdateNotificationSettingsData,
  ) {
    // Find existing settings
    let settings = await NotificationSettings.findOne({ user: userId });

    if (!settings) {
      throw new NotFoundError("Notification settings not found");
    }

    // Build update object - only include fields that are explicitly provided
    const updateObject: any = {};

    // Helper function to process notification settings
    const processSettings = <T extends Record<string, any>>(
      key: string,
      data: Partial<T> | undefined,
      fields: (keyof T)[],
    ) => {
      if (data) {
        fields.forEach((field) => {
          const value = data[field];
          if (value !== undefined) {
            updateObject[`${key}.${String(field)}`] = value;
          }
        });
      }
    };

    // Process email settings
    processSettings<IEmailSettings>("email", updateData.email, [
      "exchangeRequests",
      "sessionReminders",
      "messages",
      "reviewsAndRatings",
      "achievements",
      "securityAlerts",
    ]);

    // Process push settings
    processSettings<IPushSettings>("push", updateData.push, [
      "exchangeRequests",
      "sessionReminders",
      "messages",
      "reviewsAndRatings",
      "achievements",
    ]);

    // Process in-app settings
    processSettings<IInAppSettings>("inApp", updateData.inApp, [
      "exchangeRequests",
      "sessionReminders",
      "messages",
      "reviewsAndRatings",
      "achievements",
    ]);

    // Update settings
    const updatedSettings = await NotificationSettings.findOneAndUpdate(
      { user: userId },
      { $set: updateObject },
      { new: true, runValidators: true },
    );

    if (!updatedSettings) {
      throw new NotFoundError("Notification settings not found");
    }

    const settingsData = updatedSettings.toObject();

    return SuccessResponse({
      message: "Notification settings updated successfully",
      data: {
        email: settingsData.email,
        push: settingsData.push,
        inApp: settingsData.inApp,
      },
      httpStatus: StatusCodes.OK,
    });
  }
}

const notificationSettingsService = new NotificationSettingsService();
export default notificationSettingsService;
