import mongoose, { Schema, Document, Model } from "mongoose";

export enum OTPPurpose {
  EMAIL_VERIFICATION = "email_verification",
  PASSWORD_RESET = "password_reset",
}

export interface IOTP extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  verified: boolean;
  purpose: OTPPurpose;
  createdAt: Date;
}

const otpSchema = new Schema<IOTP>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: [true, "OTP hash is required"],
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Auto-delete expired documents
    },
    verified: {
      type: Boolean,
      default: false,
    },
    purpose: {
      type: String,
      enum: Object.values(OTPPurpose),
      default: OTPPurpose.EMAIL_VERIFICATION,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
otpSchema.index({ email: 1, verified: 1, purpose: 1 });

const OTP: Model<IOTP> = mongoose.model<IOTP>("OTP", otpSchema);

export default OTP;
