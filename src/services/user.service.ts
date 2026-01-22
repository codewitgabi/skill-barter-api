import User, { IUser } from "../models/user.model";
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

    // Combine city and country into location
    const userData = user.toObject();
    const location =
      userData.city && userData.country
        ? `${userData.city}, ${userData.country}`
        : userData.city || userData.country || null;

    const responseData = {
      first_name: userData.first_name,
      last_name: userData.last_name,
      username: userData.username,
      email: userData.email,
      about: userData.about,
      location,
      website: userData.website,
      skills: userData.skills || [],
      interests: userData.interests || [],
      language: userData.language,
      timezone: userData.timezone,
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

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true },
    ).select("-password -__v");

    if (!updatedUser) {
      throw new NotFoundError("User not found");
    }

    // Combine city and country into location
    const userData = updatedUser.toObject();
    const location =
      userData.city && userData.country
        ? `${userData.city}, ${userData.country}`
        : userData.city || userData.country || null;

    const responseData = {
      first_name: userData.first_name,
      last_name: userData.last_name,
      username: userData.username,
      email: userData.email,
      about: userData.about,
      location,
      website: userData.website,
      skills: userData.skills || [],
      interests: userData.interests || [],
      language: userData.language,
      timezone: userData.timezone,
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
}

const userService = new UserService();
export default userService;
