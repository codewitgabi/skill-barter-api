import SessionBooking, {
  ISessionBooking,
  SessionBookingStatus,
} from "../models/sessionBooking.model";
import ExchangeRequest, {
  ExchangeRequestStatus,
} from "../models/exchangeRequest.model";
import { BadRequestError, NotFoundError } from "../utils/api.errors";

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
}

const sessionBookingService = new SessionBookingService();
export default sessionBookingService;
