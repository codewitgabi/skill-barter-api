import { StatusCodes } from "http-status-codes";

export default class ApiError extends Error {
  status: string;

  constructor(
    public message: string,
    public statusCode: number,
    public errors: Array<unknown>,
  ) {
    super(message);

    this.statusCode = statusCode;
    this.status = "error";
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends ApiError {
  constructor(message = "Bad Request", errors: Array<unknown> = []) {
    super(message, StatusCodes.BAD_REQUEST, errors);
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Validation failed", errors: Array<unknown> = []) {
    super(message, StatusCodes.UNPROCESSABLE_ENTITY, errors);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Not Found", errors: Array<unknown> = []) {
    super(message, StatusCodes.NOT_FOUND, errors);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized", errors: Array<unknown> = []) {
    super(message, StatusCodes.UNAUTHORIZED, errors);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden", errors: Array<unknown> = []) {
    super(message, StatusCodes.FORBIDDEN, errors);
  }
}
