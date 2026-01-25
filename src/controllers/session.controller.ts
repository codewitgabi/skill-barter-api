import { Request, Response } from "express";
import catchAsync from "../utils/catch-async";
import sessionService from "../services/session.service";
import { SessionStatus } from "../models/session.model";
import { UnauthorizedError } from "../utils/api.errors";

export const getSessions = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new UnauthorizedError("Unauthorized");
  }

  const query = {
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    status: req.query.status as SessionStatus | undefined,
  };

  const response = await sessionService.getSessions(userId, query);

  return res.status(response.httpStatus).json(response);
});
