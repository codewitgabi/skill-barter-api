import Review from "../models/review.model";
import User from "../models/user.model";
import { BadRequestError, NotFoundError } from "../utils/api.errors";
import { SuccessResponse } from "../utils/responses";
import { StatusCodes } from "http-status-codes";

interface CreateReviewData {
  reviewedUserId: string;
  skill: string;
  rating: number;
  comment?: string;
}

class ReviewService {
  async createReview(reviewerId: string, data: CreateReviewData) {
    // Check if the reviewed user exists
    const reviewedUser = await User.findOne({
      _id: data.reviewedUserId,
      deletedAt: null,
    });

    if (!reviewedUser) {
      throw new NotFoundError("User to review not found");
    }

    // Prevent self-review
    if (reviewerId === data.reviewedUserId) {
      throw new BadRequestError("You cannot review yourself");
    }

    // Check if a review for this skill already exists
    const existingReview = await Review.findOne({
      reviewedUser: data.reviewedUserId,
      reviewer: reviewerId,
      skill: data.skill,
    });

    if (existingReview) {
      throw new BadRequestError(
        `You have already reviewed this user for the skill "${data.skill}"`,
      );
    }

    // Create the review
    await Review.create({
      reviewedUser: data.reviewedUserId,
      reviewer: reviewerId,
      skill: data.skill,
      rating: data.rating,
      comment: data.comment,
    });

    return SuccessResponse({
      message: "Thank you for sharing your feedback!",
      data: null,
      httpStatus: StatusCodes.CREATED,
    });
  }
}

const reviewService = new ReviewService();
export default reviewService;
