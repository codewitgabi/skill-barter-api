import mongoose from "mongoose";
import User, { IUser } from "../models/user.model";
import ExchangeRequest, {
  ExchangeRequestStatus,
} from "../models/exchangeRequest.model";
import Session, { SessionStatus } from "../models/session.model";
import Review from "../models/review.model";
import SkillToTeach from "../models/skillToTeach.model";
import SkillToLearn from "../models/skillToLearn.model";
import { NotFoundError, BadRequestError } from "../utils/api.errors";
import { SuccessResponse } from "../utils/responses";
import { StatusCodes } from "http-status-codes";
import { UpdateUserData } from "../types/user.type";

class UserService {
  async getUser(userId: string) {
    const user = await User.findOne({
      _id: userId,
      deletedAt: null,
    }).select("-password -__v");

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Fetch skills to teach and learn in parallel
    const [skillsToTeach, skillsToLearn] = await Promise.all([
      SkillToTeach.find({ user: userId }).select("name difficulty -_id"),
      SkillToLearn.find({ user: userId }).select("name difficulty -_id"),
    ]);

    // Combine city and country into location
    const userData = user.toObject();
    const location =
      userData.city && userData.country
        ? `${userData.city}, ${userData.country}`
        : userData.city || userData.country || null;

    const responseData = {
      id: userData._id,
      first_name: userData.first_name,
      last_name: userData.last_name,
      username: userData.username,
      email: userData.email,
      about: userData.about,
      city: userData.city,
      country: userData.country,
      location,
      website: userData.website,
      profile_picture: userData.profile_picture,
      weekly_availability: userData.weekly_availability,
      skills: userData.skills || [],
      interests: userData.interests || [],
      skillsToTeach: skillsToTeach.map((s) => ({
        name: s.name,
        difficulty: s.difficulty,
      })),
      skillsToLearn: skillsToLearn.map((s) => ({
        name: s.name,
        difficulty: s.difficulty,
      })),
      language: userData.language,
      timezone: userData.timezone,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    };

    return SuccessResponse({
      message: "User details retrieved successfully",
      data: responseData,
      httpStatus: StatusCodes.OK,
    });
  }

  async updateUser(userId: string, updateData: UpdateUserData) {
    // Check if user exists and is not deleted
    const user = await User.findOne({
      _id: userId,
      deletedAt: null,
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // If username is being updated, check for uniqueness
    if (updateData.username && updateData.username !== user.username) {
      const existingUser = await User.findOne({
        username: updateData.username.toLowerCase(),
        _id: { $ne: userId },
        deletedAt: null,
      });

      if (existingUser) {
        throw new BadRequestError("Username already taken");
      }
    }

    // If email is being updated, check for uniqueness
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await User.findOne({
        email: updateData.email.toLowerCase(),
        _id: { $ne: userId },
        deletedAt: null,
      });

      if (existingUser) {
        throw new BadRequestError("Email already taken");
      }
    }

    // Normalize username and email if provided
    if (updateData.username) {
      updateData.username = updateData.username.toLowerCase().trim();
    }
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase().trim();
    }

    // Handle website: convert empty strings to null
    if (updateData.website !== undefined) {
      updateData.website =
        updateData.website && updateData.website.trim() !== ""
          ? updateData.website.trim()
          : null;
    }

    // Extract skills to teach and learn from updateData
    const { skillsToTeach, skillsToLearn, ...userUpdateData } = updateData;

    // Update user basic data
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: userUpdateData },
      { new: true, runValidators: true },
    ).select("-password -__v");

    if (!updatedUser) {
      throw new NotFoundError("User not found");
    }

    // Handle skills to teach update
    if (skillsToTeach !== undefined) {
      // Delete existing skills to teach for this user
      await SkillToTeach.deleteMany({ user: userId });

      // Insert new skills to teach
      if (skillsToTeach.length > 0) {
        const skillsToTeachDocs = skillsToTeach.map((skill) => ({
          name: skill.name.trim(),
          difficulty: skill.difficulty,
          user: userId,
        }));
        await SkillToTeach.insertMany(skillsToTeachDocs);
      }
    }

    // Handle skills to learn update
    if (skillsToLearn !== undefined) {
      // Delete existing skills to learn for this user
      await SkillToLearn.deleteMany({ user: userId });

      // Insert new skills to learn
      if (skillsToLearn.length > 0) {
        const skillsToLearnDocs = skillsToLearn.map((skill) => ({
          name: skill.name.trim(),
          difficulty: skill.difficulty,
          user: userId,
        }));
        await SkillToLearn.insertMany(skillsToLearnDocs);
      }
    }

    // Fetch updated skills
    const [updatedSkillsToTeach, updatedSkillsToLearn] = await Promise.all([
      SkillToTeach.find({ user: userId }).select("name difficulty -_id"),
      SkillToLearn.find({ user: userId }).select("name difficulty -_id"),
    ]);

    // Combine city and country into location
    const userData = updatedUser.toObject();
    const location =
      userData.city && userData.country
        ? `${userData.city}, ${userData.country}`
        : userData.city || userData.country || null;

    const responseData = {
      id: userData._id,
      first_name: userData.first_name,
      last_name: userData.last_name,
      username: userData.username,
      email: userData.email,
      about: userData.about,
      city: userData.city,
      country: userData.country,
      location,
      website: userData.website,
      profile_picture: userData.profile_picture,
      weekly_availability: userData.weekly_availability,
      skills: userData.skills || [],
      interests: userData.interests || [],
      skillsToTeach: updatedSkillsToTeach.map((s) => ({
        name: s.name,
        difficulty: s.difficulty,
      })),
      skillsToLearn: updatedSkillsToLearn.map((s) => ({
        name: s.name,
        difficulty: s.difficulty,
      })),
      language: userData.language,
      timezone: userData.timezone,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    };

    return SuccessResponse({
      message: "User updated successfully",
      data: responseData,
      httpStatus: StatusCodes.OK,
    });
  }

  async deleteUser(userId: string) {
    const user = await User.findOne({
      _id: userId,
      deletedAt: null,
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Soft delete: set deletedAt timestamp
    await User.findByIdAndUpdate(userId, {
      $set: { deletedAt: new Date() },
    });

    return SuccessResponse({
      message: "User deleted successfully",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  async getQuickStats(userId: string) {
    // Check if user exists
    const user = await User.findOne({
      _id: userId,
      deletedAt: null,
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Calculate all stats in parallel
    const [exchanges, active, ratingData, learned, taught] = await Promise.all([
      // Exchanges: Total exchange requests where user is requester or receiver
      ExchangeRequest.countDocuments({
        $or: [{ requester: userId }, { receiver: userId }],
      }),

      // Active: Number of active sessions
      Session.countDocuments({
        $or: [{ instructor: userId }, { learner: userId }],
        status: SessionStatus.ACTIVE,
      }),

      // Rating: Average rating from reviews
      Review.aggregate([
        { $match: { reviewedUser: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
          },
        },
      ]),

      // Learned: Completed sessions where user is the learner
      Session.countDocuments({
        learner: userId,
        status: SessionStatus.COMPLETED,
      }),

      // Taught: Completed sessions where user is the instructor
      Session.countDocuments({
        instructor: userId,
        status: SessionStatus.COMPLETED,
      }),
    ]);

    // Calculate average rating
    const averageRating =
      ratingData.length > 0 && ratingData[0].averageRating
        ? Math.round(ratingData[0].averageRating * 10) / 10
        : 0;

    const stats = {
      exchanges,
      active,
      rating: averageRating,
      learned,
      taught,
    };

    return SuccessResponse({
      message: "Quick stats retrieved successfully",
      data: stats,
      httpStatus: StatusCodes.OK,
    });
  }
}

const userService = new UserService();
export default userService;
