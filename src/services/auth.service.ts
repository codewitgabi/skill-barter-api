import argon2 from "argon2";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/user.model";
import OTP, { OTPPurpose } from "../models/otp.model";
import TokenBlacklist from "../models/tokenBlacklist.model";
import SkillToTeach from "../models/skillToTeach.model";
import SkillToLearn from "../models/skillToLearn.model";
import NotificationSettings from "../models/notificationSettings.model";
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
  private generateOTP(digits: number = 6): string {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
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

    // Delete any existing OTPs for this email and purpose
    await OTP.deleteMany({ email, purpose: OTPPurpose.EMAIL_VERIFICATION });

    // Save hashed OTP
    await OTP.create({
      email,
      otp: hashedOTP,
      expiresAt,
      verified: false,
      purpose: OTPPurpose.EMAIL_VERIFICATION,
    });

    // Send email
    const mailOptions = {
      to: email,
      subject: "Verify Your Email - Skill Barter",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f7fa;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px 16px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Skill Barter</h1>
                      <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Email Verification</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                        Welcome to <strong>Skill Barter</strong>! 🎉
                      </p>
                      <p style="margin: 0 0 30px; color: #6b7280; font-size: 15px; line-height: 1.6;">
                        You're just one step away from joining our community. Use the verification code below to complete your registration.
                      </p>
                      
                      <!-- OTP Box -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="text-align: center; padding: 30px 0;">
                            <div style="display: inline-block; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px dashed #6366f1; border-radius: 12px; padding: 25px 50px;">
                              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Your Verification Code</p>
                              <p style="margin: 0; color: #6366f1; font-size: 42px; font-weight: 700; letter-spacing: 12px; font-family: 'Courier New', monospace;">${otp}</p>
                            </div>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Timer Warning -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="text-align: center; padding: 20px 0;">
                            <div style="display: inline-flex; align-items: center; background-color: #fef3c7; border-radius: 8px; padding: 12px 20px;">
                              <span style="color: #d97706; font-size: 14px;">⏱️ This code expires in <strong>10 minutes</strong></span>
                            </div>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                        If you didn't create an account with Skill Barter, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 16px 16px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 10px; color: #9ca3af; font-size: 13px; text-align: center;">
                        This is an automated message from Skill Barter. Please do not reply to this email.
                      </p>
                      <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                        © ${new Date().getFullYear()} Skill Barter. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
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
      purpose: OTPPurpose.EMAIL_VERIFICATION,
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
      purpose: OTPPurpose.EMAIL_VERIFICATION,
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

    // Create notification settings for the user
    await NotificationSettings.create({
      user: user._id,
    });

    // Delete verified OTP
    await OTP.deleteOne({ _id: verifiedOTP._id });

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens({
      userId: user._id.toString(),
      email: user.email,
    });

    // Fetch skills to teach and learn
    const [skillsToTeach, skillsToLearn] = await Promise.all([
      SkillToTeach.find({ user: user._id }).select("name difficulty -_id"),
      SkillToLearn.find({ user: user._id }).select("name difficulty -_id"),
    ]);

    // Return user without password
    const userObj = user.toObject();

    // Combine city and country into location
    const location =
      userObj.city && userObj.country
        ? `${userObj.city}, ${userObj.country}`
        : userObj.city || userObj.country || null;

    const userData = {
      id: userObj._id,
      first_name: userObj.first_name,
      last_name: userObj.last_name,
      username: userObj.username,
      email: userObj.email,
      about: userObj.about,
      city: userObj.city,
      country: userObj.country,
      location,
      website: userObj.website,
      profile_picture: userObj.profile_picture,
      weekly_availability: userObj.weekly_availability,
      skills: userObj.skills || [],
      interests: userObj.interests || [],
      skillsToTeach: skillsToTeach.map((s) => ({
        name: s.name,
        difficulty: s.difficulty,
      })),
      skillsToLearn: skillsToLearn.map((s) => ({
        name: s.name,
        difficulty: s.difficulty,
      })),
      language: userObj.language,
      timezone: userObj.timezone,
      createdAt: userObj.createdAt,
      updatedAt: userObj.updatedAt,
    };

    return SuccessResponse({
      message: "User registered successfully",
      data: {
        user: userData,
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

    // Fetch skills to teach and learn
    const [skillsToTeach, skillsToLearn] = await Promise.all([
      SkillToTeach.find({ user: user._id }).select("name difficulty -_id"),
      SkillToLearn.find({ user: user._id }).select("name difficulty -_id"),
    ]);

    // Return user without password
    const userObj = user.toObject();

    // Combine city and country into location
    const location =
      userObj.city && userObj.country
        ? `${userObj.city}, ${userObj.country}`
        : userObj.city || userObj.country || null;

    const userData = {
      id: userObj._id,
      first_name: userObj.first_name,
      last_name: userObj.last_name,
      username: userObj.username,
      email: userObj.email,
      about: userObj.about,
      city: userObj.city,
      country: userObj.country,
      location,
      website: userObj.website,
      profile_picture: userObj.profile_picture,
      weekly_availability: userObj.weekly_availability,
      skills: userObj.skills || [],
      interests: userObj.interests || [],
      skillsToTeach: skillsToTeach.map((s) => ({
        name: s.name,
        difficulty: s.difficulty,
      })),
      skillsToLearn: skillsToLearn.map((s) => ({
        name: s.name,
        difficulty: s.difficulty,
      })),
      language: userObj.language,
      timezone: userObj.timezone,
      createdAt: userObj.createdAt,
      updatedAt: userObj.updatedAt,
    };

    return SuccessResponse({
      message: "Login successful",
      data: {
        user: userData,
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

  // Forgot password - send OTP
  async forgotPassword(email: string) {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError("No account found with this email address");
    }

    // Generate 5-digit OTP
    const otp = this.generateOTP(5);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Hash OTP before storing
    const hashedOTP = await argon2.hash(otp);

    // Delete any existing password reset OTPs for this email
    await OTP.deleteMany({ email, purpose: OTPPurpose.PASSWORD_RESET });

    // Save hashed OTP
    await OTP.create({
      email,
      otp: hashedOTP,
      expiresAt,
      verified: false,
      purpose: OTPPurpose.PASSWORD_RESET,
    });

    // Send email with professional design
    const mailOptions = {
      to: email,
      subject: "Password Reset Request - Skill Barter",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f7fa;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px 16px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Skill Barter</h1>
                      <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Password Reset Request</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                        Hi <strong>${user.first_name}</strong>,
                      </p>
                      <p style="margin: 0 0 30px; color: #6b7280; font-size: 15px; line-height: 1.6;">
                        We received a request to reset your password. Use the verification code below to proceed with resetting your password.
                      </p>
                      
                      <!-- OTP Box -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="text-align: center; padding: 30px 0;">
                            <div style="display: inline-block; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px dashed #6366f1; border-radius: 12px; padding: 25px 50px;">
                              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Your Verification Code</p>
                              <p style="margin: 0; color: #6366f1; font-size: 42px; font-weight: 700; letter-spacing: 12px; font-family: 'Courier New', monospace;">${otp}</p>
                            </div>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Timer Warning -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="text-align: center; padding: 20px 0;">
                            <div style="display: inline-flex; align-items: center; background-color: #fef3c7; border-radius: 8px; padding: 12px 20px;">
                              <span style="color: #d97706; font-size: 14px;">⏱️ This code expires in <strong>10 minutes</strong></span>
                            </div>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 16px 16px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 10px; color: #9ca3af; font-size: 13px; text-align: center;">
                        This is an automated message from Skill Barter. Please do not reply to this email.
                      </p>
                      <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                        © ${new Date().getFullYear()} Skill Barter. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);

    return SuccessResponse({
      message: "Password reset code sent to your email",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  // Verify password reset OTP
  async verifyPasswordResetOTP(email: string, otp: string) {
    const otpRecord = await OTP.findOne({
      email,
      verified: false,
      purpose: OTPPurpose.PASSWORD_RESET,
    });

    if (!otpRecord) {
      throw new BadRequestError("Invalid or expired verification code");
    }

    if (otpRecord.expiresAt < new Date()) {
      throw new BadRequestError("Verification code has expired");
    }

    // Verify OTP hash
    const isOTPValid = await argon2.verify(otpRecord.otp, otp);
    if (!isOTPValid) {
      throw new BadRequestError("Invalid or expired verification code");
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    return SuccessResponse({
      message: "Verification code verified successfully",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  // Reset password
  async resetPassword(email: string, newPassword: string) {
    // Check if there's a verified password reset OTP
    const verifiedOTP = await OTP.findOne({
      email,
      verified: true,
      purpose: OTPPurpose.PASSWORD_RESET,
    });

    if (!verifiedOTP) {
      throw new BadRequestError(
        "Please verify your email first before resetting password",
      );
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Hash new password
    const hashedPassword = await argon2.hash(newPassword);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Delete the verified OTP
    await OTP.deleteOne({ _id: verifiedOTP._id });

    // Send confirmation email
    const mailOptions = {
      to: email,
      subject: "Password Changed Successfully - Skill Barter",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f7fa;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0;">
                      <div style="width: 64px; height: 64px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 32px;">✓</span>
                      </div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Password Changed</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                        Hi <strong>${user.first_name}</strong>,
                      </p>
                      <p style="margin: 0 0 25px; color: #6b7280; font-size: 15px; line-height: 1.6;">
                        Your password has been changed successfully. You can now log in to your account using your new password.
                      </p>
                      
                      <!-- Security Notice -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 0 8px 8px 0; padding: 16px 20px;">
                            <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">🔒 Security Notice</p>
                            <p style="margin: 8px 0 0; color: #7f1d1d; font-size: 13px; line-height: 1.5;">
                              If you did not make this change, please contact our support team immediately and secure your account.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 16px 16px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 10px; color: #9ca3af; font-size: 13px; text-align: center;">
                        This is an automated message from Skill Barter. Please do not reply to this email.
                      </p>
                      <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                        © ${new Date().getFullYear()} Skill Barter. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);

    return SuccessResponse({
      message: "Password reset successfully",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  // Change password (for authenticated users)
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    // Find user with password
    const user = await User.findById(userId).select("+password");
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Verify current password
    const isPasswordValid = await argon2.verify(user.password, currentPassword);
    if (!isPasswordValid) {
      throw new BadRequestError("Current password is incorrect");
    }

    // Check if new password is same as current
    const isSamePassword = await argon2.verify(user.password, newPassword);
    if (isSamePassword) {
      throw new BadRequestError(
        "New password must be different from current password",
      );
    }

    // Hash and update password
    const hashedPassword = await argon2.hash(newPassword);
    user.password = hashedPassword;
    await user.save();

    // Send confirmation email
    const mailOptions = {
      to: user.email,
      subject: "Password Changed Successfully - Skill Barter",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f7fa;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0;">
                      <div style="width: 64px; height: 64px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 32px;">✓</span>
                      </div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Password Changed</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                        Hi <strong>${user.first_name}</strong>,
                      </p>
                      <p style="margin: 0 0 25px; color: #6b7280; font-size: 15px; line-height: 1.6;">
                        Your password has been changed successfully. You can continue using your account with your new password.
                      </p>
                      
                      <!-- Security Notice -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 0 8px 8px 0; padding: 16px 20px;">
                            <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">🔒 Security Notice</p>
                            <p style="margin: 8px 0 0; color: #7f1d1d; font-size: 13px; line-height: 1.5;">
                              If you did not make this change, please secure your account immediately by resetting your password and contact our support team.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 16px 16px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 10px; color: #9ca3af; font-size: 13px; text-align: center;">
                        This is an automated message from Skill Barter. Please do not reply to this email.
                      </p>
                      <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                        © ${new Date().getFullYear()} Skill Barter. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);

    return SuccessResponse({
      message: "Password changed successfully",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }
}

const authService = new AuthService();
export default authService;
