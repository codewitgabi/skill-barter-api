import Session, { SessionStatus } from "../models/session.model";
import { SuccessResponse } from "../utils/responses";
import { StatusCodes } from "http-status-codes";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "../utils/api.errors";

interface GetSessionsQuery {
  page?: number;
  limit?: number;
  status?: SessionStatus;
}

class SessionService {
  async getSessions(userId: string, query: GetSessionsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filter: any = {
      $or: [{ instructor: userId }, { learner: userId }],
    };

    if (query.status) {
      filter.status = query.status;
    }

    const totalSessions = await Session.countDocuments(filter);

    const dashboardData = await this.getDashboardData(userId);

    const sessions = await Session.find(filter)
      .populate({
        path: "instructor",
        select: "first_name last_name username profile_picture",
      })
      .populate({
        path: "learner",
        select: "first_name last_name username profile_picture",
      })
      .populate({
        path: "sessionBooking",
        select: "skill",
      })
      .sort({ scheduledDate: 1 })
      .skip(skip)
      .limit(limit);

    const formattedSessions = sessions.map((session) => {
      const sessionData = session.toObject();
      const instructor = sessionData.instructor as any;
      const learner = sessionData.learner as any;
      const sessionBooking = sessionData.sessionBooking as any;
      const instructorId = instructor._id.toString();
      const userRole = instructorId === userId ? "instructor" : "learner";

      return {
        id: sessionData._id,
        userRole,
        instructor: {
          id: instructor._id,
          name: `${instructor.first_name} ${instructor.last_name}`,
          username: instructor.username,
          avatarUrl: instructor.profile_picture || null,
          initials:
            instructor.first_name.charAt(0).toUpperCase() +
            instructor.last_name.charAt(0).toUpperCase(),
        },
        learner: {
          id: learner._id,
          name: `${learner.first_name} ${learner.last_name}`,
          username: learner.username,
          avatarUrl: learner.profile_picture || null,
          initials:
            learner.first_name.charAt(0).toUpperCase() +
            learner.last_name.charAt(0).toUpperCase(),
        },
        skill: sessionData.skill,
        type: sessionData.type,
        status: sessionData.status,
        scheduledDate: sessionData.scheduledDate,
        duration: sessionData.duration,
        description: sessionData.description || null,
        location: sessionData.location,
        meetingLink: sessionData.meetingLink || null,
        address: sessionData.address || null,
        completedAt: sessionData.completedAt || null,
        createdAt: sessionData.createdAt,
        updatedAt: sessionData.updatedAt,
      };
    });

    const sortedSessions = this.sortSessions(formattedSessions);

    return SuccessResponse({
      message: "Sessions retrieved successfully",
      data: {
        sessions: sortedSessions,
        dashboard: dashboardData,
        pagination: {
          page,
          limit,
          total: totalSessions,
          totalPages: Math.ceil(totalSessions / limit),
        },
      },
      httpStatus: StatusCodes.OK,
    });
  }

  private async getDashboardData(userId: string) {
    const filter: any = {
      $or: [{ instructor: userId }, { learner: userId }],
    };

    const [total, active, scheduled, completed] = await Promise.all([
      Session.countDocuments(filter),
      Session.countDocuments({ ...filter, status: SessionStatus.ACTIVE }),
      Session.countDocuments({ ...filter, status: SessionStatus.SCHEDULED }),
      Session.countDocuments({ ...filter, status: SessionStatus.COMPLETED }),
    ]);

    return {
      total,
      active,
      scheduled,
      completed,
    };
  }

  private sortSessions(sessions: any[]) {
    const upcoming = sessions.filter(
      (session) => session.status !== SessionStatus.COMPLETED,
    );
    const completed = sessions.filter(
      (session) => session.status === SessionStatus.COMPLETED,
    );

    upcoming.sort((a, b) => {
      const dateA = new Date(a.scheduledDate);
      const dateB = new Date(b.scheduledDate);
      return dateA.getTime() - dateB.getTime();
    });

    completed.sort((a, b) => {
      const dateA = new Date(a.scheduledDate);
      const dateB = new Date(b.scheduledDate);
      return dateB.getTime() - dateA.getTime();
    });

    return [...upcoming, ...completed];
  }

  async completeSession(sessionId: string, userId: string) {
    // Find the session
    const session = await Session.findById(sessionId);

    if (!session) {
      throw new NotFoundError("Session not found");
    }

    const instructorId = session.instructor.toString();
    const learnerId = session.learner.toString();

    // Verify user is either instructor or learner
    if (instructorId !== userId && learnerId !== userId) {
      throw new ForbiddenError(
        "You are not authorized to complete this session",
      );
    }

    // Check if session is already completed
    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestError("Session is already marked as completed");
    }

    // Check if the session time has passed (scheduled time + duration)
    const now = new Date();
    const scheduledDate = new Date(session.scheduledDate);
    const sessionEndTime = new Date(
      scheduledDate.getTime() + session.duration * 60 * 1000,
    );

    if (now < sessionEndTime) {
      const remainingMinutes = Math.ceil(
        (sessionEndTime.getTime() - now.getTime()) / (60 * 1000),
      );
      throw new BadRequestError(
        `Session cannot be marked as completed yet. The session will end in approximately ${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}.`,
      );
    }

    // Update session status to completed
    session.status = SessionStatus.COMPLETED;
    session.completedAt = now;
    await session.save();

    return SuccessResponse({
      message: "Session marked as completed successfully",
      data: null,
      httpStatus: StatusCodes.OK,
    });
  }
}

const sessionService = new SessionService();
export default sessionService;
