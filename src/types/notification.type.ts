import { NotificationType } from "../models/notification.model";

export interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  data?: Record<string, any>;
  template?: {
    emailSubject?: string;
    emailHtml?: string;
    pushTitle?: string;
    pushBody?: string;
    pushData?: Record<string, any>;
  };
}

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  data?: Record<string, any>;
}

export interface NotificationTemplate {
  emailSubject?: string;
  emailHtml?: string;
  pushTitle?: string;
  pushBody?: string;
  pushData?: Record<string, any>;
}
