import mongoose from "mongoose";
import User from "../models/user.model";
import SkillToTeach from "../models/skillToTeach.model";
import SkillToLearn from "../models/skillToLearn.model";
import Review from "../models/review.model";
import { SuccessResponse } from "../utils/responses";
import { StatusCodes } from "http-status-codes";

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

    // Build filter for users
    const filter: any = {
      deletedAt: null,
    };

    // Build search conditions
    const searchConditions: any[] = [];
    const locationConditions: any[] = [];

    // Search by name or username
    if (query.search) {
      searchConditions.push(
        { first_name: { $regex: query.search, $options: "i" } },
        { last_name: { $regex: query.search, $options: "i" } },
        { username: { $regex: query.search, $options: "i" } },
      );
    }

    // Filter by location
    if (query.location) {
      locationConditions.push(
        { city: { $regex: query.location, $options: "i" } },
        { country: { $regex: query.location, $options: "i" } },
      );
    }

    // If skill filter is provided, find users with that skill first
    if (query.skill) {
      const [teachSkills, learnSkills] = await Promise.all([
        SkillToTeach.find({
          name: { $regex: query.skill, $options: "i" },
        }).select("user"),
        SkillToLearn.find({
          name: { $regex: query.skill, $options: "i" },
        }).select("user"),
      ]);

      const allSkillUserIds = [
        ...teachSkills.map((s) => s.user.toString()),
        ...learnSkills.map((s) => s.user.toString()),
      ];
      const skillUserIds = [...new Set(allSkillUserIds)]; // Remove duplicates

      if (skillUserIds.length === 0) {
        // No users have this skill
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

      // Filter by skill user IDs, excluding current user if provided
      const filteredSkillUserIds = currentUserId
        ? skillUserIds.filter((id) => id !== currentUserId)
        : skillUserIds;
      filter._id = {
        $in: filteredSkillUserIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    } else if (currentUserId) {
      // Exclude current user if no skill filter
      filter._id = { $ne: currentUserId };
    }

    // Combine search and location conditions
    if (searchConditions.length > 0 && locationConditions.length > 0) {
      filter.$and = [{ $or: searchConditions }, { $or: locationConditions }];
    } else if (searchConditions.length > 0) {
      filter.$or = searchConditions;
    } else if (locationConditions.length > 0) {
      filter.$or = locationConditions;
    }

    // Get users
    const users = await User.find(filter)
      .select("-password -__v -email")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalUsers = await User.countDocuments(filter);

    // Get user IDs
    const userIds = users.map((user) => user._id);

    // Fetch skills and reviews in parallel
    const [skillsToTeach, skillsToLearn, reviews] = await Promise.all([
      SkillToTeach.find({ user: { $in: userIds } }),
      SkillToLearn.find({ user: { $in: userIds } }),
      Review.aggregate([
        {
          $match: {
            reviewedUser: { $in: userIds },
          },
        },
        {
          $group: {
            _id: "$reviewedUser",
            averageRating: { $avg: "$rating" },
            numberOfReviews: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Create maps for quick lookup
    const skillsToTeachMap = new Map();
    const skillsToLearnMap = new Map();
    const reviewsMap = new Map();

    skillsToTeach.forEach((skill) => {
      const userId = skill.user.toString();
      if (!skillsToTeachMap.has(userId)) {
        skillsToTeachMap.set(userId, []);
      }
      skillsToTeachMap.get(userId).push(skill.name);
    });

    skillsToLearn.forEach((skill) => {
      const userId = skill.user.toString();
      if (!skillsToLearnMap.has(userId)) {
        skillsToLearnMap.set(userId, []);
      }
      skillsToLearnMap.get(userId).push(skill.name);
    });

    reviews.forEach((review) => {
      reviewsMap.set(review._id.toString(), {
        rating: Number(review.averageRating.toFixed(1)),
        numberOfReviews: review.numberOfReviews,
      });
    });

    // Format response data
    const connections = users.map((user) => {
      const userData = user.toObject();
      const userId = user._id.toString();

      // Generate initials
      const initials =
        userData.first_name.charAt(0).toUpperCase() +
        userData.last_name.charAt(0).toUpperCase();

      // Combine location
      const location =
        userData.city && userData.country
          ? `${userData.city}, ${userData.country}`
          : userData.city || userData.country || null;

      // Get rating data
      const reviewData = reviewsMap.get(userId) || {
        rating: 0,
        numberOfReviews: 0,
      };

      return {
        id: userId,
        avatarUrl: userData.profile_picture || null,
        initials,
        name: `${userData.first_name} ${userData.last_name}`,
        location,
        rating: reviewData.rating,
        numberOfReviews: reviewData.numberOfReviews,
        bio: userData.about || null,
        website: userData.website || null,
        teachingSkills: skillsToTeachMap.get(userId) || [],
        learningSkills: skillsToLearnMap.get(userId) || [],
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
