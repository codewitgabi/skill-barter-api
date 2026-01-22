import { Router } from "express";
import {
  sendEmailVerification,
  verifyOTP,
  registerUser,
  login,
  refreshToken,
  logout,
} from "../controllers/auth.controller";
import {
  EmailVerificationSchema,
  VerifyOTPSchema,
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  LogoutSchema,
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

export default router;
