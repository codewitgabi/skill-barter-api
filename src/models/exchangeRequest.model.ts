import mongoose, { Schema, Document, Model, Types } from "mongoose";

export enum ExchangeRequestStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined",
}

export interface IExchangeRequest extends Document {
  requester: Types.ObjectId;
  receiver: Types.ObjectId;
  message?: string;
  teachingSkill: string;
  learningSkill: string;
  status: ExchangeRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

const exchangeRequestSchema = new Schema<IExchangeRequest>(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Requester reference is required"],
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver reference is required"],
    },
    message: {
      type: String,
      trim: true,
      maxlength: [500, "Message cannot exceed 500 characters"],
    },
    teachingSkill: {
      type: String,
      required: [true, "Teaching skill is required"],
      trim: true,
      maxlength: [100, "Teaching skill cannot exceed 100 characters"],
    },
    learningSkill: {
      type: String,
      required: [true, "Learning skill is required"],
      trim: true,
      maxlength: [100, "Learning skill cannot exceed 100 characters"],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(ExchangeRequestStatus),
        message: `Status must be one of: ${Object.values(ExchangeRequestStatus).join(", ")}`,
      },
      default: ExchangeRequestStatus.PENDING,
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

// Prevent users from sending requests to themselves
exchangeRequestSchema.pre("save", async function () {
  if (this.requester.toString() === this.receiver.toString()) {
    const error = new Error("Users cannot send exchange requests to themselves");
    (error as any).statusCode = 400;
    throw error;
  }
});

// Indexes
exchangeRequestSchema.index({ requester: 1, receiver: 1 }); // For querying requests between users
exchangeRequestSchema.index({ receiver: 1, status: 1 }); // For querying pending requests for a receiver
exchangeRequestSchema.index({ requester: 1, status: 1 }); // For querying requests by requester
exchangeRequestSchema.index({ status: 1 }); // For querying by status

const ExchangeRequest: Model<IExchangeRequest> =
  mongoose.model<IExchangeRequest>("ExchangeRequest", exchangeRequestSchema);

export default ExchangeRequest;
