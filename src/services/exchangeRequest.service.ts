import ExchangeRequest, {
  IExchangeRequest,
  ExchangeRequestStatus,
} from "../models/exchangeRequest.model";
import User from "../models/user.model";
import { BadRequestError, NotFoundError } from "../utils/api.errors";
import { SuccessResponse } from "../utils/responses";
import { StatusCodes } from "http-status-codes";

interface CreateExchangeRequestData {
  receiverId: string;
  message?: string;
  teachingSkill: string;
  learningSkill: string;
}

interface GetExchangeRequestsQuery {
  page?: number;
  limit?: number;
  status?: ExchangeRequestStatus;
}

class ExchangeRequestService {
  async createExchangeRequest(
    requesterId: string,
    data: CreateExchangeRequestData,
  ) {
    // Check if receiver exists and is not deleted
    const receiver = await User.findOne({
      _id: data.receiverId,
      deletedAt: null,
    });

    if (!receiver) {
      throw new NotFoundError("Receiver user not found");
    }

    // Check if requester exists and is not deleted
    const requester = await User.findOne({
      _id: requesterId,
      deletedAt: null,
    });

    if (!requester) {
      throw new NotFoundError("Requester user not found");
    }

    // Check if there's already a pending request between these users
    const existingRequest = await ExchangeRequest.findOne({
      requester: requesterId,
      receiver: data.receiverId,
      status: ExchangeRequestStatus.PENDING,
    });

    if (existingRequest) {
      throw new BadRequestError(
        "You already have a pending exchange request with this user",
      );
    }

    // Create exchange request
    const exchangeRequest = await ExchangeRequest.create({
      requester: requesterId,
      receiver: data.receiverId,
      message: data.message,
      teachingSkill: data.teachingSkill,
      learningSkill: data.learningSkill,
      status: ExchangeRequestStatus.PENDING,
    });

    // Populate requester and receiver details
    await exchangeRequest.populate([
      {
        path: "requester",
        select: "first_name last_name username profile_picture",
      },
      {
        path: "receiver",
        select: "first_name last_name username profile_picture",
      },
    ]);

    const requestData = exchangeRequest.toObject();
    const requesterData = requestData.requester as any;
    const receiverData = requestData.receiver as any;

    // Format response
    const formattedRequest = {
      id: requestData._id,
      requester: {
        id: requesterData._id,
        name: `${requesterData.first_name} ${requesterData.last_name}`,
        username: requesterData.username,
        avatarUrl: requesterData.profile_picture || null,
        initials:
          requesterData.first_name.charAt(0).toUpperCase() +
          requesterData.last_name.charAt(0).toUpperCase(),
      },
      receiver: {
        id: receiverData._id,
        name: `${receiverData.first_name} ${receiverData.last_name}`,
        username: receiverData.username,
        avatarUrl: receiverData.profile_picture || null,
        initials:
          receiverData.first_name.charAt(0).toUpperCase() +
          receiverData.last_name.charAt(0).toUpperCase(),
      },
      message: requestData.message || null,
      teachingSkill: requestData.teachingSkill,
      learningSkill: requestData.learningSkill,
      status: requestData.status,
      createdAt: requestData.createdAt,
    };

    return SuccessResponse({
      message: "Exchange request created successfully",
      data: formattedRequest,
      httpStatus: StatusCodes.CREATED,
    });
  }

  async getExchangeRequests(userId: string, query: GetExchangeRequestsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build filter - user should be either requester or receiver
    const filter: any = {
      $or: [{ requester: userId }, { receiver: userId }],
    };

    // Filter by status if provided
    if (query.status) {
      filter.status = query.status;
    }

    // Get exchange requests
    const exchangeRequests = await ExchangeRequest.find(filter)
      .populate({
        path: "requester",
        select: "first_name last_name username profile_picture",
      })
      .populate({
        path: "receiver",
        select: "first_name last_name username profile_picture",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalRequests = await ExchangeRequest.countDocuments(filter);

    // Format response data
    const formattedRequests = exchangeRequests.map((request) => {
      const requestData = request.toObject();
      const requester = requestData.requester as any;
      const receiver = requestData.receiver as any;

      return {
        id: requestData._id,
        requester: {
          id: requester._id,
          name: `${requester.first_name} ${requester.last_name}`,
          username: requester.username,
          avatarUrl: requester.profile_picture || null,
          initials:
            requester.first_name.charAt(0).toUpperCase() +
            requester.last_name.charAt(0).toUpperCase(),
        },
        receiver: {
          id: receiver._id,
          name: `${receiver.first_name} ${receiver.last_name}`,
          username: receiver.username,
          avatarUrl: receiver.profile_picture || null,
          initials:
            receiver.first_name.charAt(0).toUpperCase() +
            receiver.last_name.charAt(0).toUpperCase(),
        },
        message: requestData.message || null,
        teachingSkill: requestData.teachingSkill,
        learningSkill: requestData.learningSkill,
        status: requestData.status,
        createdAt: requestData.createdAt,
      };
    });

    return SuccessResponse({
      message: "Exchange requests retrieved successfully",
      data: {
        exchangeRequests: formattedRequests,
        pagination: {
          page,
          limit,
          total: totalRequests,
          totalPages: Math.ceil(totalRequests / limit),
        },
      },
      httpStatus: StatusCodes.OK,
    });
  }

  async acceptExchangeRequest(requestId: string, userId: string) {
    // Find the exchange request
    const exchangeRequest = await ExchangeRequest.findById(requestId);

    if (!exchangeRequest) {
      throw new NotFoundError("Exchange request not found");
    }

    // Verify that the user is the receiver
    if (exchangeRequest.receiver.toString() !== userId) {
      throw new BadRequestError(
        "Only the receiver can accept an exchange request",
      );
    }

    // Check if request is already accepted or declined
    if (exchangeRequest.status !== ExchangeRequestStatus.PENDING) {
      throw new BadRequestError(
        `Exchange request has already been ${exchangeRequest.status}`,
      );
    }

    // Update status to accepted
    exchangeRequest.status = ExchangeRequestStatus.ACCEPTED;
    await exchangeRequest.save();

    // Populate requester and receiver details
    await exchangeRequest.populate([
      {
        path: "requester",
        select: "first_name last_name username profile_picture",
      },
      {
        path: "receiver",
        select: "first_name last_name username profile_picture",
      },
    ]);

    const requestData = exchangeRequest.toObject();
    const requesterData = requestData.requester as any;
    const receiverData = requestData.receiver as any;

    // Format response
    const formattedRequest = {
      id: requestData._id,
      requester: {
        id: requesterData._id,
        name: `${requesterData.first_name} ${requesterData.last_name}`,
        username: requesterData.username,
        avatarUrl: requesterData.profile_picture || null,
        initials:
          requesterData.first_name.charAt(0).toUpperCase() +
          requesterData.last_name.charAt(0).toUpperCase(),
      },
      receiver: {
        id: receiverData._id,
        name: `${receiverData.first_name} ${receiverData.last_name}`,
        username: receiverData.username,
        avatarUrl: receiverData.profile_picture || null,
        initials:
          receiverData.first_name.charAt(0).toUpperCase() +
          receiverData.last_name.charAt(0).toUpperCase(),
      },
      message: requestData.message || null,
      teachingSkill: requestData.teachingSkill,
      learningSkill: requestData.learningSkill,
      status: requestData.status,
      createdAt: requestData.createdAt,
    };

    return SuccessResponse({
      message: "Exchange request accepted successfully",
      data: formattedRequest,
      httpStatus: StatusCodes.OK,
    });
  }

  async declineExchangeRequest(requestId: string, userId: string) {
    // Find the exchange request
    const exchangeRequest = await ExchangeRequest.findById(requestId);

    if (!exchangeRequest) {
      throw new NotFoundError("Exchange request not found");
    }

    // Verify that the user is the receiver
    if (exchangeRequest.receiver.toString() !== userId) {
      throw new BadRequestError(
        "Only the receiver can decline an exchange request",
      );
    }

    // Check if request is already accepted or declined
    if (exchangeRequest.status !== ExchangeRequestStatus.PENDING) {
      throw new BadRequestError(
        `Exchange request has already been ${exchangeRequest.status}`,
      );
    }

    // Update status to declined
    exchangeRequest.status = ExchangeRequestStatus.DECLINED;
    await exchangeRequest.save();

    // Populate requester and receiver details
    await exchangeRequest.populate([
      {
        path: "requester",
        select: "first_name last_name username profile_picture",
      },
      {
        path: "receiver",
        select: "first_name last_name username profile_picture",
      },
    ]);

    const requestData = exchangeRequest.toObject();
    const requesterData = requestData.requester as any;
    const receiverData = requestData.receiver as any;

    // Format response
    const formattedRequest = {
      id: requestData._id,
      requester: {
        id: requesterData._id,
        name: `${requesterData.first_name} ${requesterData.last_name}`,
        username: requesterData.username,
        avatarUrl: requesterData.profile_picture || null,
        initials:
          requesterData.first_name.charAt(0).toUpperCase() +
          requesterData.last_name.charAt(0).toUpperCase(),
      },
      receiver: {
        id: receiverData._id,
        name: `${receiverData.first_name} ${receiverData.last_name}`,
        username: receiverData.username,
        avatarUrl: receiverData.profile_picture || null,
        initials:
          receiverData.first_name.charAt(0).toUpperCase() +
          receiverData.last_name.charAt(0).toUpperCase(),
      },
      message: requestData.message || null,
      teachingSkill: requestData.teachingSkill,
      learningSkill: requestData.learningSkill,
      status: requestData.status,
      createdAt: requestData.createdAt,
    };

    return SuccessResponse({
      message: "Exchange request declined successfully",
      data: formattedRequest,
      httpStatus: StatusCodes.OK,
    });
  }
}

const exchangeRequestService = new ExchangeRequestService();
export default exchangeRequestService;
