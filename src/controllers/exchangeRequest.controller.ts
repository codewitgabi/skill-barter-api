import { Request, Response } from "express";
import catchAsync from "../utils/catch-async";
import exchangeRequestService from "../services/exchangeRequest.service";
import { ExchangeRequestStatus } from "../models/exchangeRequest.model";
import { UnauthorizedError } from "../utils/api.errors";

export const createExchangeRequest = catchAsync(
  async (req: Request, res: Response) => {
    const requesterId = req.user?.userId;

    if (!requesterId) {
      throw new UnauthorizedError("Unauthorized");
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
      throw new UnauthorizedError("Unauthorized");
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

export const acceptExchangeRequest = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError("Unauthorized");
    }

    const requestId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const response = await exchangeRequestService.acceptExchangeRequest(
      requestId,
      userId,
    );

    return res.status(response.httpStatus).json(response);
  },
);

export const declineExchangeRequest = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError("Unauthorized");
    }

    const requestId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const response = await exchangeRequestService.declineExchangeRequest(
      requestId,
      userId,
    );

    return res.status(response.httpStatus).json(response);
  },
);
