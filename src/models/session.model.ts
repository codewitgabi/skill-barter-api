import mongoose, { Schema, Document, Model, Types } from "mongoose";

export enum SessionStatus {
  SCHEDULED = "scheduled",
  ACTIVE = "active",
  COMPLETED = "completed",
}

export enum SessionType {
  LEARNING = "learning",
  TEACHING = "teaching",
}

export enum SessionLocation {
  ONLINE = "online",
  IN_PERSON = "in_person",
}

export interface ISession extends Document {
  sessionBooking: Types.ObjectId; // Reference to the session booking that generated this session
  exchangeRequest: Types.ObjectId; // Reference to the exchange request
  instructor: Types.ObjectId; // User who is teaching
  learner: Types.ObjectId; // User who is learning
  skill: string; // The skill being taught/learned
  type: SessionType; // Whether this is a learning or teaching session (from the user's perspective)
  status: SessionStatus;
  scheduledDate: Date; // The date and time when the session is scheduled
  duration: number; // Duration in minutes
  description?: string; // Description of the session
  location: SessionLocation; // Online or in-person
  meetingLink?: string; // Google Meet link or other meeting URL (if online)
  address?: string; // Physical address (if in-person)
  completedAt?: Date; // When the session was marked as completed
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    sessionBooking: {
      type: Schema.Types.ObjectId,
      ref: "SessionBooking",
      required: [true, "Session booking reference is required"],
    },
    exchangeRequest: {
      type: Schema.Types.ObjectId,
      ref: "ExchangeRequest",
      required: [true, "Exchange request reference is required"],
    },
    instructor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Instructor reference is required"],
    },
    learner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Learner reference is required"],
    },
    skill: {
      type: String,
      required: [true, "Skill is required"],
      trim: true,
      maxlength: [100, "Skill cannot exceed 100 characters"],
    },
    type: {
      type: String,
      enum: {
        values: Object.values(SessionType),
        message: `Type must be one of: ${Object.values(SessionType).join(", ")}`,
      },
      required: [true, "Session type is required"],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(SessionStatus),
        message: `Status must be one of: ${Object.values(SessionStatus).join(", ")}`,
      },
      default: SessionStatus.SCHEDULED,
    },
    scheduledDate: {
      type: Date,
      required: [true, "Scheduled date is required"],
    },
    duration: {
      type: Number,
      required: [true, "Duration is required"],
      min: [15, "Duration must be at least 15 minutes"],
      max: [480, "Duration cannot exceed 480 minutes (8 hours)"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    location: {
      type: String,
      enum: {
        values: Object.values(SessionLocation),
        message: `Location must be one of: ${Object.values(SessionLocation).join(", ")}`,
      },
      default: SessionLocation.ONLINE,
    },
    meetingLink: {
      type: String,
      trim: true,
      validate: {
        validator: function (value: string | undefined) {
          const doc = this as any;
          // If location is online, meeting link should be provided
          if (doc.location === SessionLocation.ONLINE && !value) {
            return false;
          }
          // If meeting link is provided, it must be a valid URL
          if (value && !/^https?:\/\/.+/.test(value)) {
            return false;
          }
          return true;
        },
        message:
          "Meeting link is required for online sessions and must be a valid URL",
      },
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, "Address cannot exceed 200 characters"],
      validate: {
        validator: function (value: string | undefined) {
          const doc = this as any;
          // If location is in-person, address should be provided
          if (doc.location === SessionLocation.IN_PERSON && !value) {
            return false;
          }
          return true;
        },
        message: "Address is required for in-person sessions",
      },
    },
    completedAt: {
      type: Date,
      default: null,
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

// Prevent instructor and learner from being the same person
sessionSchema.pre("save", async function () {
  if (this.instructor.toString() === this.learner.toString()) {
    const error = new Error("Instructor and learner cannot be the same person");
    (error as any).statusCode = 400;
    throw error;
  }
});

// Auto-update status based on scheduled date (only if status is not manually set to completed)
sessionSchema.pre("save", async function () {
  // Don't auto-update if already marked as completed
  if ((this as any).status === SessionStatus.COMPLETED) {
    return;
  }

  const now = new Date();
  const scheduledDate = (this as any).scheduledDate as Date;
  const duration = (this as any).duration as number;
  const endTime = new Date(scheduledDate.getTime() + duration * 60 * 1000);

  // If session hasn't started yet, it's scheduled
  if (now < scheduledDate) {
    (this as any).status = SessionStatus.SCHEDULED;
  }
  // If session has started but not ended, it's active
  else if (now >= scheduledDate && now < endTime) {
    (this as any).status = SessionStatus.ACTIVE;
  }
  // If session has ended, it should be marked as completed (but allow manual override)
  // Note: You may want to add a background job to auto-complete sessions after end time
});

// Indexes
sessionSchema.index({ sessionBooking: 1 }); // For querying sessions by booking
sessionSchema.index({ exchangeRequest: 1 }); // For querying sessions by exchange request
sessionSchema.index({ instructor: 1, status: 1 }); // For querying sessions by instructor and status
sessionSchema.index({ learner: 1, status: 1 }); // For querying sessions by learner and status
sessionSchema.index({ scheduledDate: 1, status: 1 }); // For querying upcoming sessions
sessionSchema.index({ status: 1 }); // For querying by status

const Session: Model<ISession> = mongoose.model<ISession>(
  "Session",
  sessionSchema,
);

export default Session;
