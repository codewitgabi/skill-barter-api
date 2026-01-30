import {
  NotificationType,
  NotificationStatus,
} from "../models/notification.model";
import User from "../models/user.model";
import NotificationSettings from "../models/notificationSettings.model";
import { FRONTEND_URL } from "../utils/constants";
import { NotFoundError } from "../utils/api.errors";
import transporter from "../config/mail.config";
import { firestore as db, messaging } from "../config/firebase.config";
import sysLogger from "../utils/logger";

interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  data?: Record<string, any>;
}

interface NotificationTemplate {
  emailSubject?: string;
  emailHtml?: string;
  pushTitle?: string;
  pushBody?: string;
  pushData?: Record<string, any>;
}

class NotificationService {
  private getActionUrlPattern(type: NotificationType): string {
    const urlPatterns: Record<NotificationType, string> = {
      [NotificationType.EXCHANGE_REQUEST]:
        "/@me/exchange-requests/:exchangeRequestId",
      [NotificationType.SESSION_REMINDER]: "/@me/sessions/:sessionId",
      [NotificationType.MESSAGE]: "/@me/chats/:conversationId",
      [NotificationType.REVIEW_AND_RATING]: "/@me/reviews",
      [NotificationType.ACHIEVEMENT]: "/profile/achievements",
      [NotificationType.SECURITY_ALERT]: "/me/settings/security",
    };
    return urlPatterns[type];
  }

  private generateActionUrl(
    type: NotificationType,
    data?: Record<string, any>,
  ): string | undefined {
    const pattern = this.getActionUrlPattern(type);
    if (!pattern) {
      return undefined;
    }

    let url = pattern;

    // Replace dynamic parameters with values from data
    if (data) {
      // Match all :paramName patterns
      const paramRegex = /:(\w+)/g;
      url = url.replace(paramRegex, (match, paramName) => {
        const value = data[paramName];
        if (value !== undefined && value !== null) {
          return String(value);
        }
        // If parameter not found, return the original match
        return match;
      });
    }

    // If URL still contains :paramName, it means required data is missing
    // Return undefined to indicate URL couldn't be generated
    if (url.includes(":")) {
      return undefined;
    }

    // Prepend frontend URL if it's a relative path
    if (url.startsWith("/")) {
      return url;
    }

    return url;
  }

  private getNotificationSettingKey(type: NotificationType): string {
    const mapping: Record<NotificationType, string> = {
      [NotificationType.EXCHANGE_REQUEST]: "exchangeRequests",
      [NotificationType.SESSION_REMINDER]: "sessionReminders",
      [NotificationType.MESSAGE]: "messages",
      [NotificationType.REVIEW_AND_RATING]: "reviewsAndRatings",
      [NotificationType.ACHIEVEMENT]: "achievements",
      [NotificationType.SECURITY_ALERT]: "securityAlerts",
    };
    return mapping[type];
  }

  private async checkNotificationEnabled(
    userId: string,
    type: NotificationType,
    channel: "email" | "push" | "inApp",
  ): Promise<boolean> {
    const settings = await NotificationSettings.findOne({ user: userId });
    if (!settings) {
      return true; // Default to enabled if settings don't exist
    }

    const settingKey = this.getNotificationSettingKey(type);
    return (settings[channel] as any)[settingKey] !== false;
  }

  private async sendEmailNotification(
    email: string,
    subject: string,
    html: string,
  ): Promise<void> {
    try {
      const mailOptions = {
        to: email,
        subject,
        html,
      };

      await transporter.sendMail(mailOptions);
      sysLogger.info(`Email notification sent to ${email}`);
    } catch (error: any) {
      sysLogger.error(
        `Failed to send email notification to ${email}: ${error.message}`,
      );
      // Don't throw - we don't want email failures to break the flow
    }
  }

  private async sendPushNotification(
    fcmToken: string,
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    try {
      if (!fcmToken) {
        sysLogger.info(
          `No FCM token found for user ${userId}, skipping push notification`,
        );
        return;
      }

      // Convert all data values to strings (FCM requirement)
      const stringifiedData: Record<string, string> = {};
      if (data) {
        for (const [key, value] of Object.entries(data)) {
          stringifiedData[key] =
            typeof value === "string" ? value : JSON.stringify(value);
        }
      }

      const message = {
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: stringifiedData,
        android: {
          priority: "high" as const,
          notification: {
            sound: "default",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      const response = await messaging.send(message);
      sysLogger.info(
        `Push notification sent successfully to user ${userId}: ${response}`,
      );
    } catch (error: any) {
      // Handle invalid token - could be expired or unregistered
      if (
        error.code === "messaging/invalid-registration-token" ||
        error.code === "messaging/registration-token-not-registered"
      ) {
        sysLogger.warn(
          `Invalid FCM token for user ${userId}, token may be expired`,
        );
        // Optionally: Clear the invalid token from user record
        await User.findByIdAndUpdate(userId, { $set: { fcmToken: null } });
      } else {
        sysLogger.error(
          `Failed to send push notification to user ${userId}: ${error.message}`,
        );
      }
      // Don't throw - we don't want push failures to break the flow
    }
  }

  private async createInAppNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    actionUrl?: string,
    data?: Record<string, any>,
  ): Promise<void> {
    try {
      const notificationsRef = db.collection("notifications");

      const notificationData = {
        userId,
        type,
        title,
        message,
        actionUrl: actionUrl || null,
        data: data || {},
        status: NotificationStatus.UNREAD,
        readAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await notificationsRef.add(notificationData);
      sysLogger.info(
        `In-app notification created in Firestore for user ${userId}`,
      );
    } catch (error: any) {
      sysLogger.error(
        `Failed to create in-app notification in Firestore: ${error.message}`,
      );
      // Don't throw - we don't want Firestore failures to break the flow
    }
  }

  async sendNotification(
    data: CreateNotificationData,
    template?: NotificationTemplate,
  ): Promise<void> {
    // Verify user exists
    const user = await User.findById(data.userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Generate actionUrl if not provided
    const actionUrl =
      data.actionUrl ||
      this.generateActionUrl(data.type, data.data) ||
      undefined;

    // Check notification settings for each channel
    const [emailEnabled, pushEnabled, inAppEnabled] = await Promise.all([
      this.checkNotificationEnabled(data.userId, data.type, "email"),
      this.checkNotificationEnabled(data.userId, data.type, "push"),
      this.checkNotificationEnabled(data.userId, data.type, "inApp"),
    ]);

    // Process notifications in parallel (but blocking)
    const promises: Promise<void>[] = [];

    // Create in-app notification in Firestore if enabled
    if (inAppEnabled) {
      promises.push(
        this.createInAppNotification(
          data.userId,
          data.type,
          data.title,
          data.message,
          actionUrl,
          data.data,
        ),
      );
    }

    // Send email notification if enabled
    if (emailEnabled && template?.emailSubject && template?.emailHtml) {
      promises.push(
        this.sendEmailNotification(
          user.email,
          template.emailSubject,
          template.emailHtml,
        ),
      );
    }

    // Send push notification if enabled and user has FCM token
    if (pushEnabled && user.fcmToken) {
      const pushTitle = template?.pushTitle || data.title;
      const pushBody = template?.pushBody || data.message;
      promises.push(
        this.sendPushNotification(
          user.fcmToken,
          data.userId,
          pushTitle,
          pushBody,
          template?.pushData || data.data,
        ),
      );
    }

    // Wait for all notifications to be sent (blocking)
    await Promise.all(promises);

    sysLogger.info(`Notification sent successfully for user ${data.userId}`);
  }

  // Keep the old method name for backward compatibility, but make it call sendNotification
  async createNotification(
    data: CreateNotificationData,
    template?: NotificationTemplate,
  ): Promise<void> {
    return this.sendNotification(data, template);
  }
}

const notificationService = new NotificationService();
export default notificationService;
