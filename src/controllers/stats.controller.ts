import { Request, Response } from "express";
import catchAsync from "../utils/catch-async";
import statsService from "../services/stats.service";

export const getStats = catchAsync(async (req: Request, res: Response) => {
  const response = await statsService.getStats();
  return res.status(response.httpStatus).json(response);
});
