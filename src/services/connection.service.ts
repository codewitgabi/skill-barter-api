import mongoose from "mongoose";
import User from "../models/user.model";
import SkillToTeach from "../models/skillToTeach.model";
import SkillToLearn from "../models/skillToLearn.model";
import Review from "../models/review.model";
import ExchangeRequest from "../models/exchangeRequest.model";
import { SuccessResponse } from "../utils/responses";
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../utils/api.errors";

interface GetConnectionsQuery {
  page?: number;
  limit?: number;
  search?: string;
  skill?: string;
  location?: string;
}

class ConnectionService {
  async getConnections(query: GetConnectionsQuery, currentUserId?: string) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Current user is required for matching
    if (!currentUserId) {
      throw new BadRequestError(
        "Authentication required to find skill matches",
      );
    }

    const currentUserObjectId = new mongoose.Types.ObjectId(currentUserId);

    // Get current user's skills to teach and learn
    const [currentUserTeachSkills, currentUserLearnSkills] = await Promise.all([
      SkillToTeach.find({ user: currentUserId }).select("name"),
      SkillToLearn.find({ user: currentUserId }).select("name"),
    ]);

    const currentUserTeachSkillNames = currentUserTeachSkills.map((s) =>
      s.name.toLowerCase(),
    );
    const currentUserLearnSkillNames = currentUserLearnSkills.map((s) =>
      s.name.toLowerCase(),
    );

    // If current user has no skills, return empty
    if (
      currentUserTeachSkillNames.length === 0 ||
      currentUserLearnSkillNames.length === 0
    ) {
      return SuccessResponse({
        message: "Connections retrieved successfully",
        data: {
          connections: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        },
        httpStatus: StatusCodes.OK,
      });
    }

    // Get users who have exchange requests with current user (to exclude)
    const exchangeRequests = await ExchangeRequest.find({
      $or: [{ requester: currentUserId }, { receiver: currentUserId }],
    }).select("requester receiver");

    const excludedUserIds = new Set<string>([currentUserId]);
    exchangeRequests.forEach((request) => {
      excludedUserIds.add(request.requester.toString());
      excludedUserIds.add(request.receiver.toString());
    });

    const excludedObjectIds = Array.from(excludedUserIds).map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    // Build search and location match conditions
    const searchMatch: any = {};
    if (query.search) {
      searchMatch.$or = [
        { first_name: { $regex: query.search, $options: "i" } },
        { last_name: { $regex: query.search, $options: "i" } },
        { username: { $regex: query.search, $options: "i" } },
      ];
    }
    if (query.location) {
      const locationCondition = {
        $or: [
          { city: { $regex: query.location, $options: "i" } },
          { country: { $regex: query.location, $options: "i" } },
        ],
      };
      if (searchMatch.$or) {
        searchMatch.$and = [{ $or: searchMatch.$or }, locationCondition];
        delete searchMatch.$or;
      } else {
        Object.assign(searchMatch, locationCondition);
      }
    }

    // Use aggregation to find matching users at database level
    // A match requires:
    // 1. Other user teaches something current user wants to learn
    // 2. Other user wants to learn something current user teaches
    const matchingUsersAggregation = await User.aggregate([
      // Stage 1: Filter out excluded users and deleted users
      {
        $match: {
          _id: { $nin: excludedObjectIds },
          deletedAt: null,
          ...searchMatch,
        },
      },
      // Stage 2: Lookup skills to teach for each user
      {
        $lookup: {
          from: "skilltoteaches",
          localField: "_id",
          foreignField: "user",
          as: "teachSkills",
        },
      },
      // Stage 3: Lookup skills to learn for each user
      {
        $lookup: {
          from: "skilltolearns",
          localField: "_id",
          foreignField: "user",
          as: "learnSkills",
        },
      },
      // Stage 4: Add lowercase skill names for matching
      {
        $addFields: {
          teachSkillNames: {
            $map: {
              input: "$teachSkills",
              as: "skill",
              in: { $toLower: "$$skill.name" },
            },
          },
          learnSkillNames: {
            $map: {
              input: "$learnSkills",
              as: "skill",
              in: { $toLower: "$$skill.name" },
            },
          },
        },
      },
      // Stage 5: Check for mutual match
      {
        $match: {
          // Other user teaches something I want to learn
          teachSkillNames: { $in: currentUserLearnSkillNames },
          // Other user wants to learn something I teach
          learnSkillNames: { $in: currentUserTeachSkillNames },
        },
      },
      // Stage 6: Apply skill filter if provided
      ...(query.skill
        ? [
            {
              $match: {
                $or: [
                  {
                    teachSkillNames: {
                      $regex: query.skill.toLowerCase(),
                      $options: "i",
                    },
                  },
                  {
                    learnSkillNames: {
                      $regex: query.skill.toLowerCase(),
                      $options: "i",
                    },
                  },
                ],
              },
            },
          ]
        : []),
      // Stage 7: Lookup reviews for rating
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "reviewedUser",
          as: "reviews",
        },
      },
      // Stage 8: Calculate average rating
      {
        $addFields: {
          averageRating: {
            $cond: {
              if: { $gt: [{ $size: "$reviews" }, 0] },
              then: { $avg: "$reviews.rating" },
              else: 0,
            },
          },
          numberOfReviews: { $size: "$reviews" },
        },
      },
      // Stage 9: Sort by creation date
      { $sort: { createdAt: -1 } },
      // Stage 10: Facet for pagination
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ]);

    const result = matchingUsersAggregation[0];
    const totalUsers = result.metadata[0]?.total || 0;
    const users = result.data;

    // Format response data
    const connections = users.map((user: any) => {
      // Generate initials
      const initials =
        user.first_name.charAt(0).toUpperCase() +
        user.last_name.charAt(0).toUpperCase();

      // Combine location
      const location =
        user.city && user.country
          ? `${user.city}, ${user.country}`
          : user.city || user.country || null;

      return {
        id: user._id.toString(),
        avatarUrl: user.profile_picture || null,
        initials,
        name: `${user.first_name} ${user.last_name}`,
        location,
        rating: user.averageRating
          ? Number(user.averageRating.toFixed(1))
          : 0,
        numberOfReviews: user.numberOfReviews || 0,
        bio: user.about || null,
        website: user.website || null,
        teachingSkills: user.teachSkills.map((s: any) => s.name),
        learningSkills: user.learnSkills.map((s: any) => s.name),
      };
    });

    return SuccessResponse({
      message: "Connections retrieved successfully",
      data: {
        connections,
        pagination: {
          page,
          limit,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limit),
        },
      },
      httpStatus: StatusCodes.OK,
    });
  }
}

const connectionService = new ConnectionService();
export default connectionService;
