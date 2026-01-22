import { validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import APIError from "../utils/api.errors";

// Middleware to check validation results
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error("Validation failed");
    (error as APIError).statusCode = 400;
    (error as APIError).errors = errors.array();

    return next(error);
  }
  next();
};
