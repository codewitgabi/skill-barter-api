import { Request, Response } from "express";
import catchAsync from "../utils/catch-async";
import exchangeRequestService from "../services/exchangeRequest.service";
import { ExchangeRequestStatus } from "../models/exchangeRequest.model";

export const createExchangeRequest = catchAsync(
  async (req: Request, res: Response) => {
    const requesterId = req.user?.userId;

    if (!requesterId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const response = await exchangeRequestService.createExchangeRequest(
      requesterId,
      req.body,
    );

    return res.status(response.httpStatus).json(response);
  },
);

export const getExchangeRequests = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const query = {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      status: req.query.status as ExchangeRequestStatus | undefined,
    };

    const response = await exchangeRequestService.getExchangeRequests(
      userId,
      query,
    );

    return res.status(response.httpStatus).json(response);
  },
);
