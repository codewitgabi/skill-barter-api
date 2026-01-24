import SessionBooking, {
  ISessionBooking,
  SessionBookingStatus,
  DayOfWeek,
} from "../models/sessionBooking.model";
import ExchangeRequest, {
  ExchangeRequestStatus,
} from "../models/exchangeRequest.model";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from "../utils/api.errors";
import { SuccessResponse } from "../utils/responses";
import { StatusCodes } from "http-status-codes";

interface GetSessionBookingsQuery {
  page?: number;
  limit?: number;
}

class SessionBookingService {
  async createSessionBookingsForExchangeRequest(
    exchangeRequestId: string,
  ): Promise<{ booking1: ISessionBooking; booking2: ISessionBooking }> {
    // Find the exchange request
    const exchangeRequest = await ExchangeRequest.findById(exchangeRequestId);

    if (!exchangeRequest) {
      throw new NotFoundError("Exchange request not found");
    }

    // Check if exchange request is accepted
    if (exchangeRequest.status !== ExchangeRequestStatus.ACCEPTED) {
      throw new BadRequestError(
        "Session bookings can only be created for accepted exchange requests",
      );
    }

    // Check if session bookings already exist for this exchange request
    const existingBookings = await SessionBooking.find({
      exchangeRequest: exchangeRequestId,
    });

    if (existingBookings.length > 0) {
      throw new BadRequestError(
        "Session bookings already exist for this exchange request",
      );
    }

    const requesterId = exchangeRequest.requester.toString();
    const receiverId = exchangeRequest.receiver.toString();

    // Create first booking: Requester proposes to teach their skill to receiver
    const booking1 = await SessionBooking.create({
      exchangeRequest: exchangeRequestId,
      proposer: requesterId,
      recipient: receiverId,
      skill: exchangeRequest.teachingSkill,
      status: SessionBookingStatus.DRAFT,
      daysPerWeek: 1,
      daysOfWeek: ["Monday"],
      startTime: "09:00",
      duration: 60,
      totalSessions: 1,
      version: 1,
    });

    // Create second booking: Receiver proposes to teach their skill to requester
    const booking2 = await SessionBooking.create({
      exchangeRequest: exchangeRequestId,
      proposer: receiverId,
      recipient: requesterId,
      skill: exchangeRequest.learningSkill,
      status: SessionBookingStatus.DRAFT,
      daysPerWeek: 1,
      daysOfWeek: ["Monday"],
      startTime: "09:00",
      duration: 60,
      totalSessions: 1,
      version: 1,
    });

    return { booking1, booking2 };
  }

  async getSessionBookings(userId: string, query: GetSessionBookingsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filter: any = {
      $or: [
        { proposer: userId },
        {
          recipient: userId,
          status: { $ne: SessionBookingStatus.DRAFT },
        },
      ],
    };

    const totalBookings = await SessionBooking.countDocuments(filter);

    const sessionBookings = await SessionBooking.find(filter)
      .populate({
        path: "exchangeRequest",
        select: "teachingSkill learningSkill status",
      })
      .populate({
        path: "proposer",
        select: "first_name last_name username profile_picture",
      })
      .populate({
        path: "recipient",
        select: "first_name last_name username profile_picture",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const formatBooking = (booking: any) => {
      const bookingData = booking.toObject();
      const proposer = bookingData.proposer as any;
      const recipient = bookingData.recipient as any;
      const exchangeRequest = bookingData.exchangeRequest as any;
      const proposerId = proposer._id.toString();
      const userRole = proposerId === userId ? "proposer" : "recipient";

      return {
        id: bookingData._id,
        userRole,
        exchangeRequest: {
          id: exchangeRequest._id,
          teachingSkill: exchangeRequest.teachingSkill,
          learningSkill: exchangeRequest.learningSkill,
          status: exchangeRequest.status,
        },
        proposer: {
          id: proposer._id,
          name: `${proposer.first_name} ${proposer.last_name}`,
          username: proposer.username,
          avatarUrl: proposer.profile_picture || null,
          initials:
            proposer.first_name.charAt(0).toUpperCase() +
            proposer.last_name.charAt(0).toUpperCase(),
        },
        recipient: {
          id: recipient._id,
          name: `${recipient.first_name} ${recipient.last_name}`,
          username: recipient.username,
          avatarUrl: recipient.profile_picture || null,
          initials:
            recipient.first_name.charAt(0).toUpperCase() +
            recipient.last_name.charAt(0).toUpperCase(),
        },
        skill: bookingData.skill,
        status: bookingData.status,
        daysPerWeek: bookingData.daysPerWeek,
        daysOfWeek: bookingData.daysOfWeek,
        startTime: bookingData.startTime,
        duration: bookingData.duration,
        totalSessions: bookingData.totalSessions,
        message: bookingData.message || null,
        version: bookingData.version,
        createdAt: bookingData.createdAt,
        updatedAt: bookingData.updatedAt,
      };
    };

    const formattedBookings = sessionBookings.map(formatBooking);

    const draftBookings = formattedBookings.filter(
      (booking) => booking.status === SessionBookingStatus.DRAFT,
    );
    const pendingBookings = formattedBookings.filter(
      (booking) => booking.status === SessionBookingStatus.PENDING,
    );

    return SuccessResponse({
      message: "Session bookings retrieved successfully",
      data: {
        draftBookings,
        pendingBookings,
        pagination: {
          page,
          limit,
          total: totalBookings,
          totalPages: Math.ceil(totalBookings / limit),
        },
      },
      httpStatus: StatusCodes.OK,
    });
  }

  async updateSessionBooking(
    bookingId: string,
    userId: string,
    updateData: {
      daysPerWeek?: number;
      daysOfWeek?: DayOfWeek[];
      startTime?: string;
      duration?: number;
      totalSessions?: number;
      message?: string;
    },
  ) {
    const booking = await SessionBooking.findById(bookingId);

    if (!booking) {
      throw new NotFoundError("Session booking not found");
    }

    const proposerId = booking.proposer.toString();
    const recipientId = booking.recipient.toString();
    const isProposer = proposerId === userId;
    const isRecipient = recipientId === userId;

    if (!isProposer && !isRecipient) {
      throw new ForbiddenError(
        "You are not authorized to update this session booking",
      );
    }

    const updateFields: any = {};

    if (isProposer) {
      if (updateData.daysPerWeek !== undefined) {
        updateFields.daysPerWeek = updateData.daysPerWeek;
      }
      if (updateData.daysOfWeek !== undefined) {
        updateFields.daysOfWeek = updateData.daysOfWeek;
      }
      if (updateData.startTime !== undefined) {
        updateFields.startTime = updateData.startTime;
      }
      if (updateData.duration !== undefined) {
        updateFields.duration = updateData.duration;
      }
      if (updateData.totalSessions !== undefined) {
        updateFields.totalSessions = updateData.totalSessions;
      }
      if (updateData.message !== undefined) {
        updateFields.message = updateData.message;
      }

      if (
        booking.status === SessionBookingStatus.DRAFT &&
        (updateData.daysPerWeek !== undefined ||
          updateData.daysOfWeek !== undefined ||
          updateData.startTime !== undefined ||
          updateData.duration !== undefined ||
          updateData.totalSessions !== undefined)
      ) {
        updateFields.status = SessionBookingStatus.PENDING;
      }

      if (
        updateData.daysPerWeek !== undefined ||
        updateData.daysOfWeek !== undefined ||
        updateData.startTime !== undefined ||
        updateData.duration !== undefined ||
        updateData.totalSessions !== undefined
      ) {
        updateFields.version = booking.version + 1;
      }
    } else if (isRecipient) {
      if (updateData.message !== undefined) {
        updateFields.message = updateData.message;
        updateFields.status = SessionBookingStatus.CHANGES_REQUESTED;
      } else {
        throw new BadRequestError(
          "Recipients can only update the message field",
        );
      }
    }

    const updatedBooking = await SessionBooking.findByIdAndUpdate(
      bookingId,
      { $set: updateFields },
      { new: true, runValidators: true },
    )
      .populate({
        path: "exchangeRequest",
        select: "teachingSkill learningSkill status",
      })
      .populate({
        path: "proposer",
        select: "first_name last_name username profile_picture",
      })
      .populate({
        path: "recipient",
        select: "first_name last_name username profile_picture",
      });

    if (!updatedBooking) {
      throw new NotFoundError("Session booking not found");
    }

    const bookingData = updatedBooking.toObject();
    const proposer = bookingData.proposer as any;
    const recipient = bookingData.recipient as any;
    const exchangeRequest = bookingData.exchangeRequest as any;

    const formattedBooking = {
      id: bookingData._id,
      userRole: isProposer ? "proposer" : "recipient",
      exchangeRequest: {
        id: exchangeRequest._id,
        teachingSkill: exchangeRequest.teachingSkill,
        learningSkill: exchangeRequest.learningSkill,
        status: exchangeRequest.status,
      },
      proposer: {
        id: proposer._id,
        name: `${proposer.first_name} ${proposer.last_name}`,
        username: proposer.username,
        avatarUrl: proposer.profile_picture || null,
        initials:
          proposer.first_name.charAt(0).toUpperCase() +
          proposer.last_name.charAt(0).toUpperCase(),
      },
      recipient: {
        id: recipient._id,
        name: `${recipient.first_name} ${recipient.last_name}`,
        username: recipient.username,
        avatarUrl: recipient.profile_picture || null,
        initials:
          recipient.first_name.charAt(0).toUpperCase() +
          recipient.last_name.charAt(0).toUpperCase(),
      },
      skill: bookingData.skill,
      status: bookingData.status,
      daysPerWeek: bookingData.daysPerWeek,
      daysOfWeek: bookingData.daysOfWeek,
      startTime: bookingData.startTime,
      duration: bookingData.duration,
      totalSessions: bookingData.totalSessions,
      message: bookingData.message || null,
      version: bookingData.version,
      createdAt: bookingData.createdAt,
      updatedAt: bookingData.updatedAt,
    };

    return SuccessResponse({
      message: "Session booking updated successfully",
      data: formattedBooking,
      httpStatus: StatusCodes.OK,
    });
  }
}

const sessionBookingService = new SessionBookingService();
export default sessionBookingService;
