import User from "../models/user.model";
import ExchangeRequest from "../models/exchangeRequest.model";
import Review from "../models/review.model";
import { SuccessResponse } from "../utils/responses";
import { StatusCodes } from "http-status-codes";

class StatsService {
  async getStats() {
    // Get total active members (excluding deleted users)
    const totalMembers = await User.countDocuments({ deletedAt: null });

    // Get most exchanged skill
    // Aggregate both teachingSkill and learningSkill from exchange requests
    const mostExchangedSkill = await ExchangeRequest.aggregate([
      {
        $project: {
          skills: ["$teachingSkill", "$learningSkill"],
        },
      },
      {
        $unwind: "$skills",
      },
      {
        $group: {
          _id: "$skills",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 1,
      },
    ]);

    const mostExchanged =
      mostExchangedSkill.length > 0
        ? mostExchangedSkill[0]._id
        : "No exchanges yet";

    // Get average rating from all reviews
    const ratingStats = await Review.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 },
        },
      },
    ]);

    const averageRating =
      ratingStats.length > 0 && ratingStats[0].totalRatings > 0
        ? parseFloat(ratingStats[0].averageRating.toFixed(1))
        : 0;

    const stats = {
      mostExchanged,
      activeMembers: totalMembers,
      topRated: averageRating,
    };

    return SuccessResponse({
      status: "success",
      message: "Stats retrieved successfully",
      data: stats,
      httpStatus: StatusCodes.OK,
    });
  }
}

const statsService = new StatsService();
export default statsService;
