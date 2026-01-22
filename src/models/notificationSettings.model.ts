import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEmailSettings {
  exchangeRequests: boolean;
  sessionReminders: boolean;
  messages: boolean;
  reviewsAndRatings: boolean;
  achievements: boolean;
  securityAlerts: boolean;
}

export interface IPushSettings {
  exchangeRequests: boolean;
  sessionReminders: boolean;
  messages: boolean;
  reviewsAndRatings: boolean;
  achievements: boolean;
}

export interface IInAppSettings {
  exchangeRequests: boolean;
  sessionReminders: boolean;
  messages: boolean;
  reviewsAndRatings: boolean;
  achievements: boolean;
}

export interface INotificationSettings extends Document {
  user: mongoose.Types.ObjectId;
  email: IEmailSettings;
  push: IPushSettings;
  inApp: IInAppSettings;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSettingsSchema = new Schema<INotificationSettings>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      unique: true, // Ensures one-to-one relationship
      index: true,
    },
    email: {
      exchangeRequests: {
        type: Boolean,
        default: false,
      },
      sessionReminders: {
        type: Boolean,
        default: true,
      },
      messages: {
        type: Boolean,
        default: false,
      },
      reviewsAndRatings: {
        type: Boolean,
        default: true,
      },
      achievements: {
        type: Boolean,
        default: true,
      },
      securityAlerts: {
        type: Boolean,
        default: true,
      },
    },
    push: {
      exchangeRequests: {
        type: Boolean,
        default: true,
      },
      sessionReminders: {
        type: Boolean,
        default: true,
      },
      messages: {
        type: Boolean,
        default: true,
      },
      reviewsAndRatings: {
        type: Boolean,
        default: true,
      },
      achievements: {
        type: Boolean,
        default: true,
      },
    },
    inApp: {
      exchangeRequests: {
        type: Boolean,
        default: true,
      },
      sessionReminders: {
        type: Boolean,
        default: true,
      },
      messages: {
        type: Boolean,
        default: true,
      },
      reviewsAndRatings: {
        type: Boolean,
        default: true,
      },
      achievements: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret: any) => {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (doc, ret: any) => {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Indexes
notificationSettingsSchema.index({ user: 1 }, { unique: true });

const NotificationSettings: Model<INotificationSettings> =
  mongoose.model<INotificationSettings>(
    "NotificationSettings",
    notificationSettingsSchema,
  );

export default NotificationSettings;
