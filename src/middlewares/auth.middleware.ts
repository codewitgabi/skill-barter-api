import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../utils/constants";
import authService from "../services/auth.service";
import { UnauthorizedError } from "../utils/api.errors";
import User from "../models/user.model";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("No token provided");
    }

    const token = authHeader.substring(7);

    // Check if token is blacklisted
    const isBlacklisted = await authService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedError("Token has been revoked");
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET as string) as {
      userId: string;
      email: string;
    };

    // Verify user still exists and is not soft-deleted
    const user = await User.findOne({
      _id: decoded.userId,
      deletedAt: null,
    });
    if (!user) {
      throw new UnauthorizedError("User no longer exists");
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError("Invalid token"));
    } else {
      next(error);
    }
  }
};

/**
 * Optional authentication middleware
 * Populates req.user if a valid token is provided, but doesn't fail if no token or invalid token
 * Useful for endpoints that work for both authenticated and unauthenticated users
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided - continue without user
      return next();
    }

    const token = authHeader.substring(7);

    // Check if token is blacklisted
    const isBlacklisted = await authService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      // Token is blacklisted - continue without user
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET as string) as {
      userId: string;
      email: string;
    };

    // Verify user still exists and is not soft-deleted
    const user = await User.findOne({
      _id: decoded.userId,
      deletedAt: null,
    });
    if (!user) {
      // User doesn't exist - continue without user
      return next();
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    // Any error (invalid token, etc.) - continue without user
    next();
  }
};
