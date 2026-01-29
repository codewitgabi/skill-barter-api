import { Request, Response } from "express";
import catchAsync from "../utils/catch-async";
import userService from "../services/user.service";
import authService from "../services/auth.service";
import { UnauthorizedError } from "../utils/api.errors";

export const getUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new UnauthorizedError("Unauthorized");
  }

  const response = await userService.getUser(userId);

  return res.status(response.httpStatus).json(response);
});

export const updateUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new UnauthorizedError("Unauthorized");
  }

  const response = await userService.updateUser(userId, req.body);

  return res.status(response.httpStatus).json(response);
});

export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new UnauthorizedError("Unauthorized");
  }

  const response = await userService.deleteUser(userId);

  return res.status(response.httpStatus).json(response);
});

export const getQuickStats = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new UnauthorizedError("Unauthorized");
  }

  const response = await userService.getQuickStats(userId);

  return res.status(response.httpStatus).json(response);
});

export const changePassword = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError("Unauthorized");
    }

    const { currentPassword, newPassword } = req.body;

    const response = await authService.changePassword(
      userId,
      currentPassword,
      newPassword,
    );

    return res.status(response.httpStatus).json(response);
  },
);
