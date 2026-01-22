import mongoose, { Schema, Document, Model, Types } from "mongoose";

export enum DifficultyLevel {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
}

export interface ISkillToTeach extends Document {
  name: string;
  difficulty: DifficultyLevel;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const skillToTeachSchema = new Schema<ISkillToTeach>(
  {
    name: {
      type: String,
      required: [true, "Skill name is required"],
      trim: true,
      minlength: [1, "Skill name must be at least 1 character"],
      maxlength: [100, "Skill name cannot exceed 100 characters"],
    },
    difficulty: {
      type: String,
      required: [true, "Difficulty level is required"],
      enum: {
        values: Object.values(DifficultyLevel),
        message:
          "Difficulty must be one of: beginner, intermediate, advanced, expert",
      },
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
skillToTeachSchema.index({ user: 1, name: 1 }, { unique: true }); // Prevent duplicate skills per user
skillToTeachSchema.index({ difficulty: 1 });

const SkillToTeach: Model<ISkillToTeach> = mongoose.model<ISkillToTeach>(
  "SkillToTeach",
  skillToTeachSchema,
);

export default SkillToTeach;
