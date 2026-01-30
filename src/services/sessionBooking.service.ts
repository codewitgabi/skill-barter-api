import SessionBooking, {
  ISessionBooking,
  SessionBookingStatus,
  DayOfWeek,
} from "../models/sessionBooking.model";
import ExchangeRequest, {
  ExchangeRequestStatus,
} from "../models/exchangeRequest.model";
import Session, { SessionType, SessionLocation } from "../models/session.model";
import User from "../models/user.model";
import googleMeetService from "./googleMeet.service";
import notificationService from "./notification.service";
import { NotificationType } from "../models/notification.model";
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from "../utils/api.errors";
import { SuccessResponse } from "../utils/responses";
import { StatusCodes } from "http-status-codes";
import { FRONTEND_URL } from "../utils/constants";

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
    const changesMadeBookings = formattedBookings.filter(
      (booking) => booking.status === SessionBookingStatus.CHANGES_MADE,
    );

    return SuccessResponse({
      message: "Session bookings retrieved successfully",
      data: {
        draftBookings,
        pendingBookings,
        changesRequestedBookings,
        changesMadeBookings,
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

  async getSessionBooking(bookingId: string, userId: string) {
    const booking = await SessionBooking.findById(bookingId)
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

    if (!booking) {
      throw new NotFoundError("Session booking not found");
    }

    const proposerId = booking.proposer._id.toString();
    const recipientId = booking.recipient._id.toString();

    if (proposerId !== userId && recipientId !== userId) {
      throw new ForbiddenError(
        "You are not authorized to view this session booking",
      );
    }

    if (
      booking.status === SessionBookingStatus.DRAFT &&
      recipientId === userId
    ) {
      throw new NotFoundError("Session booking not found");
    }

    const bookingData = booking.toObject();
    const proposer = bookingData.proposer as any;
    const recipient = bookingData.recipient as any;
    const exchangeRequest = bookingData.exchangeRequest as any;
    const userRole = proposerId === userId ? "proposer" : "recipient";

    const formattedBooking = {
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

    return SuccessResponse({
      message: "Session booking retrieved successfully",
      data: formattedBooking,
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
        booking.status === SessionBookingStatus.CHANGES_REQUESTED &&
        (updateData.daysPerWeek !== undefined ||
          updateData.daysOfWeek !== undefined ||
          updateData.startTime !== undefined ||
          updateData.duration !== undefined ||
          updateData.totalSessions !== undefined)
      ) {
        updateFields.status = SessionBookingStatus.CHANGES_MADE;
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
    const booking =
      await SessionBooking.findById(bookingId).populate("exchangeRequest");

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

    if (
      booking.status !== SessionBookingStatus.PENDING &&
      booking.status !== SessionBookingStatus.CHANGES_MADE
    ) {
      throw new BadRequestError(
        "Only pending or changes_made session bookings can be accepted",
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

    const insertedSessions = await Session.insertMany(sessions);

    // Send notifications for the first upcoming session to both instructor and learner
    if (insertedSessions.length > 0) {
      const firstSession = insertedSessions[0];
      const instructorId = firstSession.instructor.toString();
      const learnerId = firstSession.learner.toString();
      const sessionDate = new Date(firstSession.scheduledDate);
      const formattedDate = sessionDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const sessionUrl = `${FRONTEND_URL}/@me/sessions/${firstSession._id.toString()}`;
      const skillName = refreshedBooking.skill;
      const totalSessionsCount = insertedSessions.length;

      // Fetch instructor and learner details for personalized notifications
      const [instructorUser, learnerUser] = await Promise.all([
        User.findById(instructorId).select("first_name last_name"),
        User.findById(learnerId).select("first_name last_name"),
      ]);

      const instructorName = instructorUser
        ? `${instructorUser.first_name} ${instructorUser.last_name}`
        : "Instructor";
      const learnerName = learnerUser
        ? `${learnerUser.first_name} ${learnerUser.last_name}`
        : "Learner";

      // Notify instructor
      try {
        await notificationService.sendNotification(
          {
            userId: instructorId,
            type: NotificationType.SESSION_REMINDER,
            title: "Session Scheduled",
            message: `Your session for ${skillName} is scheduled for ${formattedDate}`,
            data: {
              sessionId: firstSession._id.toString(),
            },
          },
          {
            emailSubject: `Your Teaching Session is Scheduled - Skill Barter`,
            emailHtml: `
              <!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f7fa;">
                  <tr>
                    <td style="padding: 40px 20px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                        <!-- Header -->
                        <tr>
                          <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0;">
                            <div style="width: 64px; height: 64px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; margin: 0 auto 16px; line-height: 64px;">
                              <span style="font-size: 32px;">📅</span>
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Sessions Scheduled!</h1>
                          </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                          <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                              Hi <strong>${instructorUser?.first_name || "there"}</strong>,
                            </p>
                            <p style="margin: 0 0 25px; color: #6b7280; font-size: 15px; line-height: 1.6;">
                              Great news! Your teaching sessions have been scheduled. <strong>${learnerName}</strong> is excited to learn <strong>${skillName}</strong> from you.
                            </p>
                            
                            <!-- Session Details Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                              <tr>
                                <td style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 24px;">
                                  <p style="margin: 0 0 16px; color: #374151; font-size: 14px; font-weight: 600;">Session Details:</p>
                                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                      <td style="padding: 8px 0;">
                                        <span style="color: #6b7280; font-size: 13px;">Skill:</span>
                                        <p style="margin: 4px 0 0; color: #059669; font-size: 16px; font-weight: 600;">${skillName}</p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 8px 0;">
                                        <span style="color: #6b7280; font-size: 13px;">Your Role:</span>
                                        <p style="margin: 4px 0 0; color: #374151; font-size: 16px; font-weight: 600;">Instructor</p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 8px 0;">
                                        <span style="color: #6b7280; font-size: 13px;">Student:</span>
                                        <p style="margin: 4px 0 0; color: #374151; font-size: 16px; font-weight: 600;">${learnerName}</p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 8px 0;">
                                        <span style="color: #6b7280; font-size: 13px;">First Session:</span>
                                        <p style="margin: 4px 0 0; color: #374151; font-size: 16px; font-weight: 600;">${formattedDate}</p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 8px 0;">
                                        <span style="color: #6b7280; font-size: 13px;">Total Sessions:</span>
                                        <p style="margin: 4px 0 0; color: #374151; font-size: 16px; font-weight: 600;">${totalSessionsCount} session${totalSessionsCount > 1 ? "s" : ""}</p>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                            
                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                              <tr>
                                <td style="padding: 30px 0; text-align: center;">
                                  <a href="${sessionUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">View Session Details</a>
                                </td>
                              </tr>
                            </table>
                            
                            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                              Make sure to prepare your materials and be ready to share your knowledge. Happy teaching!
                            </p>
                          </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                          <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 16px 16px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px; color: #9ca3af; font-size: 13px; text-align: center;">
                              This is an automated message from Skill Barter.
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                              © ${new Date().getFullYear()} Skill Barter. All rights reserved.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
              </html>
            `,
            pushTitle: "Teaching Session Scheduled! 📅",
            pushBody: `Your ${skillName} session with ${learnerName} starts ${formattedDate}`,
            pushData: {
              type: "session_scheduled",
              sessionId: firstSession._id.toString(),
              role: "instructor",
            },
          },
        );
      } catch (error: any) {
        console.error(
          "Failed to send session notification to instructor:",
          error.message,
        );
      }

      // Notify learner
      try {
        await notificationService.sendNotification(
          {
            userId: learnerId,
            type: NotificationType.SESSION_REMINDER,
            title: "Session Scheduled",
            message: `Your session for ${skillName} is scheduled for ${formattedDate}`,
            data: {
              sessionId: firstSession._id.toString(),
            },
          },
          {
            emailSubject: `Your Learning Session is Scheduled - Skill Barter`,
            emailHtml: `
              <!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f7fa;">
                  <tr>
                    <td style="padding: 40px 20px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                        <!-- Header -->
                        <tr>
                          <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px 16px 0 0;">
                            <div style="width: 64px; height: 64px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; margin: 0 auto 16px; line-height: 64px;">
                              <span style="font-size: 32px;">🎓</span>
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Sessions Scheduled!</h1>
                          </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                          <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                              Hi <strong>${learnerUser?.first_name || "there"}</strong>,
                            </p>
                            <p style="margin: 0 0 25px; color: #6b7280; font-size: 15px; line-height: 1.6;">
                              Exciting news! Your learning sessions have been scheduled. Get ready to learn <strong>${skillName}</strong> from <strong>${instructorName}</strong>.
                            </p>
                            
                            <!-- Session Details Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                              <tr>
                                <td style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 24px;">
                                  <p style="margin: 0 0 16px; color: #374151; font-size: 14px; font-weight: 600;">Session Details:</p>
                                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                      <td style="padding: 8px 0;">
                                        <span style="color: #6b7280; font-size: 13px;">Skill:</span>
                                        <p style="margin: 4px 0 0; color: #6366f1; font-size: 16px; font-weight: 600;">${skillName}</p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 8px 0;">
                                        <span style="color: #6b7280; font-size: 13px;">Your Role:</span>
                                        <p style="margin: 4px 0 0; color: #374151; font-size: 16px; font-weight: 600;">Learner</p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 8px 0;">
                                        <span style="color: #6b7280; font-size: 13px;">Instructor:</span>
                                        <p style="margin: 4px 0 0; color: #374151; font-size: 16px; font-weight: 600;">${instructorName}</p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 8px 0;">
                                        <span style="color: #6b7280; font-size: 13px;">First Session:</span>
                                        <p style="margin: 4px 0 0; color: #374151; font-size: 16px; font-weight: 600;">${formattedDate}</p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 8px 0;">
                                        <span style="color: #6b7280; font-size: 13px;">Total Sessions:</span>
                                        <p style="margin: 4px 0 0; color: #374151; font-size: 16px; font-weight: 600;">${totalSessionsCount} session${totalSessionsCount > 1 ? "s" : ""}</p>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                            
                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                              <tr>
                                <td style="padding: 30px 0; text-align: center;">
                                  <a href="${sessionUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">View Session Details</a>
                                </td>
                              </tr>
                            </table>
                            
                            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                              Come prepared with questions and an open mind. Happy learning!
                            </p>
                          </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                          <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 16px 16px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px; color: #9ca3af; font-size: 13px; text-align: center;">
                              This is an automated message from Skill Barter.
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                              © ${new Date().getFullYear()} Skill Barter. All rights reserved.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
              </html>
            `,
            pushTitle: "Learning Session Scheduled! 🎓",
            pushBody: `Your ${skillName} session with ${instructorName} starts ${formattedDate}`,
            pushData: {
              type: "session_scheduled",
              sessionId: firstSession._id.toString(),
              role: "learner",
            },
          },
        );
      } catch (error: any) {
        console.error(
          "Failed to send session notification to learner:",
          error.message,
        );
      }
    }

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

    // Fetch user emails for calendar invitations
    const [instructor, learner] = await Promise.all([
      User.findById(proposerId).select("email"),
      User.findById(recipientId).select("email"),
    ]);

    if (!instructor || !learner) {
      throw new BadRequestError("Instructor or learner not found");
    }

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
        const summary = `Skill Session: ${skill}`;
        const description = `Teaching session for ${skill}`;
        meetingLink = await googleMeetService.createScheduledMeeting(
          scheduledDate,
          duration,
          summary,
          description,
          instructor.email,
          learner.email,
        );
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
