import mongoose, { Schema, Document, Model } from "mongoose";

// Interface for User document
export interface IUser extends Document {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password: string;
  about?: string;
  city?: string;
  country?: string;
  website?: string;
  profile_picture?: string;
  weekly_availability?: number;
  skills?: string[];
  interests?: string[];
  language?: string;
  timezone?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// User Schema
const userSchema = new Schema<IUser>(
  {
    first_name: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [1, "First name must be at least 1 character"],
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    last_name: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [1, "Last name must be at least 1 character"],
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-z0-9_]+$/,
        "Username can only contain lowercase letters, numbers, and underscores",
      ],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Don't include password in queries by default
    },
    about: {
      type: String,
      trim: true,
      maxlength: [1000, "About section cannot exceed 1000 characters"],
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, "City name cannot exceed 100 characters"],
    },
    country: {
      type: String,
      trim: true,
      maxlength: [100, "Country name cannot exceed 100 characters"],
    },
    website: {
      type: String,
      trim: true,
      match: [
        /^https?:\/\/.+/,
        "Please provide a valid URL (must start with http:// or https://)",
      ],
      default: null,
    },
    profile_picture: {
      type: String,
      trim: true,
      match: [
        /^https?:\/\/.+/,
        "Please provide a valid URL (must start with http:// or https://)",
      ],
      default: null,
    },
    weekly_availability: {
      type: Number,
      min: [0, "Weekly availability cannot be negative"],
      max: [168, "Weekly availability cannot exceed 168 hours (7 days)"],
      default: 0,
    },
    skills: {
      type: [String],
      default: [],
      validate: {
        validator: (skills: string[]) => skills.length <= 50,
        message: "Cannot have more than 50 skills",
      },
    },
    interests: {
      type: [String],
      default: [],
      validate: {
        validator: (interests: string[]) => interests.length <= 50,
        message: "Cannot have more than 50 interests",
      },
    },
    language: {
      type: String,
      trim: true,
      maxlength: [50, "Language cannot exceed 50 characters"],
      default: "en",
    },
    timezone: {
      type: String,
      trim: true,
      match: [
        /^[A-Za-z_]+\/[A-Za-z_]+$/,
        "Please provide a valid timezone (e.g., America/New_York)",
      ],
      default: "Africa/Lagos",
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret: any) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (doc, ret: any) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Indexes
userSchema.index({ city: 1, country: 1 });
userSchema.index({ skills: 1 });
userSchema.index({ deletedAt: 1 });

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
