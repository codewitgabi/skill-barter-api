import argon2 from "argon2";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/user.model";
import OTP from "../models/otp.model";
import TokenBlacklist from "../models/tokenBlacklist.model";
import SkillToTeach from "../models/skillToTeach.model";
import SkillToLearn from "../models/skillToLearn.model";
import transporter from "../config/mail.config";
import {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRE,
  JWT_REFRESH_EXPIRE,
} from "../utils/constants";
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from "../utils/api.errors";
import { SuccessResponse } from "../utils/responses";
import { StatusCodes } from "http-status-codes";
import { RegisterData, LoginData, TokenPayload } from "../types/auth.type";

class AuthService {
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateTokens(payload: TokenPayload): {
    accessToken: string;
    refreshToken: string;
  } {
    const secret = JWT_SECRET as string;
    const refreshSecret = JWT_REFRESH_SECRET as string;

    const accessToken = jwt.sign(payload, secret, {
      expiresIn: (JWT_EXPIRE || "15m") as string,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, refreshSecret, {
      expiresIn: (JWT_REFRESH_EXPIRE || "7d") as string,
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  }

  async sendEmailVerification(email: string) {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new BadRequestError("Email already registered");
    }

    // Generate OTP
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Hash OTP before storing
    const hashedOTP = await argon2.hash(otp);

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email });

    // Save hashed OTP
    await OTP.create({
      email,
      otp: hashedOTP,
      expiresAt,
      verified: false,
    });

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Email Verification - Skill Barter",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="color: #4CAF50; font-size: 32px; text-align: center; letter-spacing: 5px;">${otp}</h1>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return SuccessResponse({
      message: "Verification code sent to your email",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  async verifyOTP(email: string, otp: string) {
    const otpRecord = await OTP.findOne({
      email,
      verified: false,
    });

    if (!otpRecord) {
      throw new BadRequestError("Invalid or expired OTP");
    }

    if (otpRecord.expiresAt < new Date()) {
      throw new BadRequestError("OTP has expired");
    }

    // Verify OTP hash
    const isOTPValid = await argon2.verify(otpRecord.otp, otp);
    if (!isOTPValid) {
      throw new BadRequestError("Invalid or expired OTP");
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    return SuccessResponse({
      message: "Email verified successfully",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  async register(data: RegisterData) {
    // Check if email is verified
    const verifiedOTP = await OTP.findOne({
      email: data.email,
      verified: true,
    });

    if (!verifiedOTP) {
      throw new BadRequestError(
        "Email not verified. Please verify your email first.",
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new BadRequestError("User already exists");
    }

    // Generate username from email if not provided
    const username =
      data.email.split("@")[0] + Math.floor(Math.random() * 1000).toString();

    // Hash password
    const hashedPassword = await argon2.hash(data.password);

    // Create user
    const user = await User.create({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      username,
      password: hashedPassword,
      about: data.about,
      city: data.city,
      country: data.country,
      profile_picture: data.profile_picture,
      weekly_availability: data.weekly_availability || 0,
    });

    // Create skills to teach
    if (data.skillsToTeach && data.skillsToTeach.length > 0) {
      const skillsToTeachData = data.skillsToTeach.map((skill) => ({
        name: skill.name,
        difficulty: skill.difficulty,
        user: user._id,
      }));
      await SkillToTeach.insertMany(skillsToTeachData);
    }

    // Create skills to learn
    if (data.skillsToLearn && data.skillsToLearn.length > 0) {
      const skillsToLearnData = data.skillsToLearn.map((skill) => ({
        name: skill.name,
        difficulty: skill.difficulty,
        user: user._id,
      }));
      await SkillToLearn.insertMany(skillsToLearnData);
    }

    // Delete verified OTP
    await OTP.deleteOne({ _id: verifiedOTP._id });

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens({
      userId: user._id.toString(),
      email: user.email,
    });

    // Return user without password
    const userObj = user.toObject();

    return SuccessResponse({
      message: "User registered successfully",
      data: {
        user: userObj as IUser,
        accessToken,
        refreshToken,
      },
      httpStatus: StatusCodes.CREATED,
    });
  }

  // Login user
  async login(data: LoginData) {
    // Find user with password
    const user = await User.findOne({ email: data.email }).select("+password");

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await argon2.verify(user.password, data.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens({
      userId: user._id.toString(),
      email: user.email,
    });

    // Return user without password
    const userObj = user.toObject();

    return SuccessResponse({
      message: "Login successful",
      data: {
        user: userObj as IUser,
        accessToken,
        refreshToken,
      },
      httpStatus: StatusCodes.OK,
    });
  }

  // Refresh access token
  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken,
        JWT_REFRESH_SECRET as string,
      ) as TokenPayload;

      // Check if token is blacklisted
      const blacklisted = await TokenBlacklist.findOne({ token: refreshToken });
      if (blacklisted) {
        throw new UnauthorizedError("Token has been revoked");
      }

      // Check if user exists
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Generate new tokens
      const tokens = this.generateTokens({
        userId: user._id.toString(),
        email: user.email,
      });

      // Blacklist old refresh token
      const decodedToken = jwt.decode(refreshToken) as jwt.JwtPayload;
      if (decodedToken?.exp) {
        await TokenBlacklist.create({
          token: refreshToken,
          expiresAt: new Date(decodedToken.exp * 1000),
        });
      }

      return SuccessResponse({
        message: "Token refreshed successfully",
        data: tokens,
        httpStatus: StatusCodes.OK,
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError("Invalid refresh token");
      }
      throw error;
    }
  }

  // Logout - blacklist access token
  async logout(accessToken: string, refreshToken?: string) {
    // Validate access token is provided
    if (!accessToken || accessToken.trim() === "") {
      throw new BadRequestError("Access token is required");
    }

    try {
      // Decode tokens to get expiration (decode doesn't validate, so works with expired tokens)
      const decodedAccess = jwt.decode(accessToken) as jwt.JwtPayload | null;
      const decodedRefresh = refreshToken
        ? (jwt.decode(refreshToken) as jwt.JwtPayload | null)
        : null;

      // Validate token format (decode returns null for malformed tokens)
      if (!decodedAccess) {
        throw new BadRequestError("Invalid access token format");
      }

      // Blacklist access token if it has expiration and isn't already blacklisted
      if (decodedAccess.exp) {
        const isAlreadyBlacklisted = await TokenBlacklist.findOne({
          token: accessToken,
        });

        if (!isAlreadyBlacklisted) {
          await TokenBlacklist.create({
            token: accessToken,
            expiresAt: new Date(decodedAccess.exp * 1000),
          });
        }
      }

      // Blacklist refresh token if provided
      if (refreshToken && decodedRefresh?.exp) {
        const isAlreadyBlacklisted = await TokenBlacklist.findOne({
          token: refreshToken,
        });

        if (!isAlreadyBlacklisted) {
          await TokenBlacklist.create({
            token: refreshToken,
            expiresAt: new Date(decodedRefresh.exp * 1000),
          });
        }
      }

      return SuccessResponse({
        message: "Logged out successfully",
        data: null,
        httpStatus: StatusCodes.OK,
      });
    } catch (error) {
      // Re-throw if it's already a known error
      if (error instanceof BadRequestError) {
        throw error;
      }
      // For other errors (like database errors), provide more context
      throw new BadRequestError(
        error instanceof Error ? error.message : "Failed to logout",
      );
    }
  }

  // Check if token is blacklisted
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklisted = await TokenBlacklist.findOne({ token });
    return !!blacklisted;
  }
}

const authService = new AuthService();
export default authService;
