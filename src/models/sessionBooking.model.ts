import mongoose, { Schema, Document, Model, Types } from "mongoose";

export enum SessionBookingStatus {
  DRAFT = "draft", // Booking created with defaults, not yet configured by proposer
  PENDING = "pending", // Booking configured and ready for recipient to review
  ACCEPTED = "accepted", // Booking accepted by recipient
  CHANGES_REQUESTED = "changes_requested", // Recipient requested changes
  CHANGES_MADE = "changes_made", // Proposer made changes in response to recipient's request, waiting for recipient review
}

export enum DayOfWeek {
  MONDAY = "Monday",
  TUESDAY = "Tuesday",
  WEDNESDAY = "Wednesday",
  THURSDAY = "Thursday",
  FRIDAY = "Friday",
  SATURDAY = "Saturday",
  SUNDAY = "Sunday",
}

export interface ISessionBooking extends Document {
  exchangeRequest: Types.ObjectId;
  proposer: Types.ObjectId; // User who created this availability proposal
  recipient: Types.ObjectId; // User who needs to accept/request changes
  skill: string; // The skill being taught in these sessions
  status: SessionBookingStatus;
  daysPerWeek: number;
  daysOfWeek: DayOfWeek[];
  startTime: string; // Time in HH:MM format (24-hour)
  duration: number; // Duration in minutes
  totalSessions: number;
  message?: string; // Optional message when requesting changes or responding
  version: number; // Track negotiation rounds
  createdAt: Date;
  updatedAt: Date;
}

const sessionBookingSchema = new Schema<ISessionBooking>(
  {
    exchangeRequest: {
      type: Schema.Types.ObjectId,
      ref: "ExchangeRequest",
      required: [true, "Exchange request reference is required"],
      index: true,
    },
    proposer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Proposer reference is required"],
      index: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient reference is required"],
      index: true,
    },
    skill: {
      type: String,
      required: [true, "Skill is required"],
      trim: true,
      maxlength: [100, "Skill cannot exceed 100 characters"],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(SessionBookingStatus),
        message: `Status must be one of: ${Object.values(SessionBookingStatus).join(", ")}`,
      },
      default: SessionBookingStatus.DRAFT,
    },
    daysPerWeek: {
      type: Number,
      required: [true, "Days per week is required"],
      min: [1, "Days per week must be at least 1"],
      max: [7, "Days per week cannot exceed 7"],
    },
    daysOfWeek: {
      type: [String],
      required: [true, "Days of week are required"],
      validate: {
        validator: (days: string[]) => {
          const validDays = Object.values(DayOfWeek);
          return (
            days.length > 0 &&
            days.length <= 7 &&
            days.every((day) => validDays.includes(day as DayOfWeek)) &&
            new Set(days).size === days.length // No duplicates
          );
        },
        message:
          "Days of week must be valid day names with no duplicates, between 1 and 7 days",
      },
    },
    startTime: {
      type: String,
      required: [true, "Start time is required"],
      match: [
        /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Start time must be in HH:MM format (24-hour)",
      ],
    },
    duration: {
      type: Number,
      required: [true, "Duration is required"],
      min: [15, "Duration must be at least 15 minutes"],
      max: [480, "Duration cannot exceed 480 minutes (8 hours)"],
    },
    totalSessions: {
      type: Number,
      required: [true, "Total sessions is required"],
      min: [1, "Total sessions must be at least 1"],
      max: [1000, "Total sessions cannot exceed 1000"],
    },
    message: {
      type: String,
      trim: true,
      maxlength: [500, "Message cannot exceed 500 characters"],
    },
    version: {
      type: Number,
      default: 1,
      min: [1, "Version must be at least 1"],
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

// Prevent users from creating bookings for themselves
sessionBookingSchema.pre("save", async function () {
  if (this.proposer.toString() === this.recipient.toString()) {
    const error = new Error(
      "Users cannot create session bookings for themselves",
    );
    (error as any).statusCode = 400;
    throw error;
  }
});

// Indexes
sessionBookingSchema.index({ exchangeRequest: 1, proposer: 1 }); // For querying bookings by exchange request and proposer
sessionBookingSchema.index({ recipient: 1, status: 1 }); // For querying pending bookings for a recipient
sessionBookingSchema.index({ proposer: 1, status: 1 }); // For querying bookings by proposer
sessionBookingSchema.index({ status: 1 }); // For querying by status

const SessionBooking: Model<ISessionBooking> = mongoose.model<ISessionBooking>(
  "SessionBooking",
  sessionBookingSchema,
);

export default SessionBooking;
