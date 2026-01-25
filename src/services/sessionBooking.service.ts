import SessionBooking, {
  ISessionBooking,
  SessionBookingStatus,
  DayOfWeek,
} from "../models/sessionBooking.model";
import ExchangeRequest, {
  ExchangeRequestStatus,
} from "../models/exchangeRequest.model";
import Session, { SessionType, SessionLocation } from "../models/session.model";
import googleMeetService from "./googleMeet.service";
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
    const changesRequestedBookings = formattedBookings.filter(
      (booking) => booking.status === SessionBookingStatus.CHANGES_REQUESTED,
    );

    return SuccessResponse({
      message: "Session bookings retrieved successfully",
      data: {
        draftBookings,
        pendingBookings,
        changesRequestedBookings,
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

  async acceptSessionBooking(bookingId: string, userId: string) {
    const booking = await SessionBooking.findById(bookingId).populate(
      "exchangeRequest",
    );

    if (!booking) {
      throw new NotFoundError("Session booking not found");
    }

    const bookingData = booking.toObject ? booking.toObject() : booking;
    
    if (
      !bookingData ||
      !bookingData.daysPerWeek ||
      !bookingData.daysOfWeek ||
      !Array.isArray(bookingData.daysOfWeek) ||
      bookingData.daysOfWeek.length === 0 ||
      !bookingData.startTime ||
      !bookingData.totalSessions ||
      !bookingData.duration
    ) {
      throw new BadRequestError(
        "Session booking is missing required fields for session generation",
      );
    }

    const recipientId = booking.recipient.toString();

    if (recipientId !== userId) {
      throw new ForbiddenError(
        "Only the recipient can accept a session booking",
      );
    }

    if (booking.status !== SessionBookingStatus.PENDING) {
      throw new BadRequestError(
        "Only pending session bookings can be accepted",
      );
    }

    const exchangeRequest = booking.exchangeRequest as any;

    booking.status = SessionBookingStatus.ACCEPTED;
    await booking.save();

    const refreshedBooking = await SessionBooking.findById(bookingId);
    if (!refreshedBooking) {
      throw new NotFoundError("Session booking not found after update");
    }

    const refreshedBookingData = refreshedBooking.toObject
      ? refreshedBooking.toObject()
      : refreshedBooking;

    if (
      !refreshedBookingData ||
      !refreshedBookingData.daysPerWeek ||
      !refreshedBookingData.daysOfWeek ||
      !Array.isArray(refreshedBookingData.daysOfWeek) ||
      refreshedBookingData.daysOfWeek.length === 0 ||
      !refreshedBookingData.startTime ||
      !refreshedBookingData.totalSessions ||
      !refreshedBookingData.duration ||
      !refreshedBookingData.skill
    ) {
      throw new BadRequestError(
        "Session booking is missing required fields for session generation",
      );
    }

    const sessions = await this.generateSessionsFromBooking(
      refreshedBooking,
      exchangeRequest,
    );

    await Session.insertMany(sessions);

    return SuccessResponse({
      message: "Session booking accepted and sessions created successfully",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }

  private async generateSessionsFromBooking(
    booking: ISessionBooking,
    exchangeRequest: any,
  ) {
    if (
      !booking ||
      !booking.daysOfWeek ||
      !Array.isArray(booking.daysOfWeek) ||
      booking.daysOfWeek.length === 0 ||
      !booking.totalSessions ||
      !booking.startTime ||
      !booking.duration ||
      !booking.skill
    ) {
      throw new BadRequestError(
        "Session booking is missing required fields for session generation",
      );
    }

    const sessions: any[] = [];
    const { daysOfWeek, totalSessions, startTime, duration, skill } = booking;
    
    if (!booking.proposer || !booking.recipient) {
      throw new BadRequestError(
        "Session booking is missing proposer or recipient information",
      );
    }
    
    const proposerId = booking.proposer.toString();
    const recipientId = booking.recipient.toString();

    const startDate = this.getStartDate(daysOfWeek);
    const [hours, minutes] = startTime.split(":").map(Number);

    for (let i = 0; i < totalSessions; i++) {
      const dayIndex = i % daysOfWeek.length;
      const weekNumber = Math.floor(i / daysOfWeek.length);
      const dayName = daysOfWeek[dayIndex];

      const sessionDate = this.getNextDateForDay(
        startDate,
        dayName,
        weekNumber,
      );

      const scheduledDate = new Date(sessionDate);
      scheduledDate.setHours(hours, minutes, 0, 0);

      let meetingLink = "";
      try {
        meetingLink = await googleMeetService.createMeetingSpace();
      } catch (error: any) {
        console.error(
          `Failed to create Google Meet for session ${i + 1}:`,
          error.message,
        );
      }

      sessions.push({
        sessionBooking: booking._id,
        exchangeRequest: booking.exchangeRequest,
        instructor: proposerId,
        learner: recipientId,
        skill,
        type: SessionType.TEACHING,
        scheduledDate,
        duration,
        location: SessionLocation.ONLINE,
        meetingLink,
      });
    }

    return sessions;
  }


  private getStartDate(daysOfWeek: DayOfWeek[]): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const todayDayName = dayNames[today.getDay()];
    const dayIndices = daysOfWeek.map((day) => dayNames.indexOf(day));

    if (dayIndices.includes(today.getDay())) {
      return today;
    }

    const nextDayIndex = dayIndices.find((idx) => idx > today.getDay());
    if (nextDayIndex !== undefined) {
      const daysUntil = nextDayIndex - today.getDay();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + daysUntil);
      return startDate;
    }

    const firstDayIndex = Math.min(...dayIndices);
    const daysUntil = 7 - today.getDay() + firstDayIndex;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + daysUntil);
    return startDate;
  }

  private getNextDateForDay(
    startDate: Date,
    dayName: DayOfWeek,
    weekOffset: number,
  ): Date {
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const targetDayIndex = dayNames.indexOf(dayName);
    const startDayIndex = startDate.getDay();

    let daysToAdd = targetDayIndex - startDayIndex;
    if (daysToAdd < 0) {
      daysToAdd += 7;
    }

    const firstOccurrence = new Date(startDate);
    firstOccurrence.setDate(startDate.getDate() + daysToAdd);

    const targetDate = new Date(firstOccurrence);
    targetDate.setDate(firstOccurrence.getDate() + weekOffset * 7);
    return targetDate;
  }
}

const sessionBookingService = new SessionBookingService();
export default sessionBookingService;
