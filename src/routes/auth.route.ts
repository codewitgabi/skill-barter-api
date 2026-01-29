import { Router } from "express";
import {
  sendEmailVerification,
  verifyOTP,
  registerUser,
  login,
  refreshToken,
  logout,
  forgotPassword,
  verifyPasswordResetOTP,
  resetPassword,
} from "../controllers/auth.controller";
import {
  EmailVerificationSchema,
  VerifyOTPSchema,
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  LogoutSchema,
  ForgotPasswordSchema,
  VerifyPasswordResetOTPSchema,
  ResetPasswordSchema,
} from "../validators/auth.validators";

const router = Router();

router.post(
  "/email-verification",
  EmailVerificationSchema,
  sendEmailVerification,
);
router.post("/verify-otp", VerifyOTPSchema, verifyOTP);
router.post("/register", RegisterSchema, registerUser);
router.post("/login", LoginSchema, login);
router.post("/refresh-token", RefreshTokenSchema, refreshToken);
router.post("/logout", LogoutSchema, logout);
router.post("/forgot-password", ForgotPasswordSchema, forgotPassword);
router.post(
  "/verify-password-reset-otp",
  VerifyPasswordResetOTPSchema,
  verifyPasswordResetOTP,
);
router.post("/reset-password", ResetPasswordSchema, resetPassword);

export default router;
