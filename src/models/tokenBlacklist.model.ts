import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITokenBlacklist extends Document {
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

const tokenBlacklistSchema = new Schema<ITokenBlacklist>(
  {
    token: {
      type: String,
      required: [true, "Token is required"],
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Auto-delete expired tokens
    },
  },
  {
    timestamps: true,
  },
);

const TokenBlacklist: Model<ITokenBlacklist> = mongoose.model<ITokenBlacklist>(
  "TokenBlacklist",
  tokenBlacklistSchema,
);

export default TokenBlacklist;
