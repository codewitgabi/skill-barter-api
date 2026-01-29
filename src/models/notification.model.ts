// Notification enums for type safety
// Notifications are stored in Firestore, not MongoDB

export enum NotificationType {
  EXCHANGE_REQUEST = "exchange_request",
  SESSION_REMINDER = "session_reminder",
  MESSAGE = "message",
  REVIEW_AND_RATING = "review_and_rating",
  ACHIEVEMENT = "achievement",
  SECURITY_ALERT = "security_alert",
}

export enum NotificationStatus {
  UNREAD = "unread",
  READ = "read",
}
