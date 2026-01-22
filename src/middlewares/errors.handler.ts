/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable  @typescript-eslint/no-explicit-any */

import { Request, Response, NextFunction } from "express";
import APIError from "../utils/api.errors";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import errorCodes, { IErrorStatus } from "../utils/error-codes";

const handleValidationError = (err: mongoose.Error.ValidationError) => {
  // Transform Mongoose validation error into a custom format
  const errors = Object.values(err.errors).map((error: any) => ({
    type: "field",
    field: error.path,
    msg: error.message,
    location: "body",
  }));

  return errors;
};

export const RequestErrorHandler = (
  err: Error | APIError,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Default values

  let statusCode = 500;
  const status = "error";
  let message = "Something went wrong";
  let errors = undefined;

  // If it's our custom APIError

  if ("statusCode" in err) {
    statusCode = err.statusCode;
    message = err.message;
    errors = (err as APIError).errors;
  } else if (err instanceof mongoose.Error.ValidationError) {
    // Mongoose validation error

    const formattedErrors = handleValidationError(err);

    statusCode = 422;
    message = "Validation Error";
    errors = formattedErrors;
  } else if (err.name === "CastError") {
    // Mongoose cast error

    statusCode = 400;
    message = `Invalid mongoose error`;
  }

  // Send the error response

  res.status(statusCode).json({
    statusCode,
    status,
    error: {
      code: errorCodes[statusCode as IErrorStatus],
      message,
      ...(errors && { details: errors }),
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
};

export const NotFoundErrorHandler = (req: Request, res: Response) => {
  res.status(StatusCodes.NOT_FOUND).json({
    statusCode: StatusCodes.NOT_FOUND,
    status: "error",
    error: {
      code: errorCodes[StatusCodes.NOT_FOUND],
      message: "Not found",
    },
  });
};
