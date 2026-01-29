import { Request, Response } from "express";
import catchAsync from "../utils/catch-async";
import authService from "../services/auth.service";

export const sendEmailVerification = catchAsync(
  async (req: Request, res: Response) => {
    const response = await authService.sendEmailVerification(req.body.email);

    return res.status(response.httpStatus).json(response);
  },
);

export const verifyOTP = catchAsync(async (req: Request, res: Response) => {
  const response = await authService.verifyOTP(req.body.email, req.body.otp);

  return res.status(response.httpStatus).json(response);
});

export const registerUser = catchAsync(async (req: Request, res: Response) => {
  const response = await authService.register({ ...req.body });

  return res.status(response.httpStatus).json(response);
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const response = await authService.login({
    email: req.body.email,
    password: req.body.password,
  });

  return res.status(response.httpStatus).json(response);
});

export const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const response = await authService.refreshToken(req.body.refreshToken);

  return res.status(response.httpStatus).json(response);
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  let accessToken = "";

  // Extract token from Authorization header if present
  if (authHeader && authHeader.startsWith("Bearer ")) {
    accessToken = authHeader.substring(7);
  }

  const { refreshToken } = req.body;

  const response = await authService.logout(accessToken, refreshToken);

  return res.status(response.httpStatus).json(response);
});

export const forgotPassword = catchAsync(
  async (req: Request, res: Response) => {
    const response = await authService.forgotPassword(req.body.email);

    return res.status(response.httpStatus).json(response);
  },
);

export const verifyPasswordResetOTP = catchAsync(
  async (req: Request, res: Response) => {
    const response = await authService.verifyPasswordResetOTP(
      req.body.email,
      req.body.otp,
    );

    return res.status(response.httpStatus).json(response);
  },
);

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const response = await authService.resetPassword(
    req.body.email,
    req.body.password,
  );

  return res.status(response.httpStatus).json(response);
});
