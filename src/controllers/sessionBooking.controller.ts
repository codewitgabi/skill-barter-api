import { Request, Response } from "express";
import catchAsync from "../utils/catch-async";
import sessionBookingService from "../services/sessionBooking.service";
import { UnauthorizedError } from "../utils/api.errors";

export const getSessionBookings = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError("Unauthorized");
    }

    const query = {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const response = await sessionBookingService.getSessionBookings(
      userId,
      query,
    );

    return res.status(response.httpStatus).json(response);
  },
);

export const updateSessionBooking = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError("Unauthorized");
    }

    const bookingId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const response = await sessionBookingService.updateSessionBooking(
      bookingId,
      userId,
      req.body,
    );

    return res.status(response.httpStatus).json(response);
  },
);

export const acceptSessionBooking = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError("Unauthorized");
    }

    const bookingId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const response = await sessionBookingService.acceptSessionBooking(
      bookingId,
      userId,
    );

    return res.status(response.httpStatus).json(response);
  },
);
