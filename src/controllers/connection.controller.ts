import { Request, Response } from "express";
import catchAsync from "../utils/catch-async";
import connectionService from "../services/connection.service";

export const getConnections = catchAsync(
  async (req: Request, res: Response) => {
    const query = {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      search: req.query.search as string | undefined,
      skill: req.query.skill as string | undefined,
      location: req.query.location as string | undefined,
    };

    const currentUserId = req.user?.userId;

    const response = await connectionService.getConnections(
      query,
      currentUserId,
    );

    return res.status(response.httpStatus).json(response);
  },
);
