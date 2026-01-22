import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IReview extends Document {
  reviewedUser: Types.ObjectId;
  reviewer: Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    reviewedUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reviewed user reference is required"],
    },
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reviewer reference is required"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      validate: {
        validator: Number.isInteger,
        message: "Rating must be an integer",
      },
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
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

// Prevent users from reviewing themselves
reviewSchema.pre("save", async function () {
  if (this.reviewedUser.toString() === this.reviewer.toString()) {
    const error = new Error("Users cannot review themselves");
    (error as any).statusCode = 400;
    throw error;
  }
});

// Indexes
reviewSchema.index({ reviewedUser: 1, reviewer: 1 }, { unique: true }); // Prevent duplicate reviews from same reviewer
reviewSchema.index({ reviewedUser: 1 }); // For querying all reviews for a user
reviewSchema.index({ rating: 1 }); // For querying by rating

const Review: Model<IReview> = mongoose.model<IReview>("Review", reviewSchema);

export default Review;
