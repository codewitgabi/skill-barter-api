import ExchangeRequest, {
  IExchangeRequest,
  ExchangeRequestStatus,
} from "../models/exchangeRequest.model";
import User from "../models/user.model";
import { BadRequestError, NotFoundError } from "../utils/api.errors";
import { SuccessResponse } from "../utils/responses";
import { StatusCodes } from "http-status-codes";
import sessionBookingService from "./sessionBooking.service";
import notificationService from "./notification.service";
import contactService from "./contact.service";
import { NotificationType } from "../models/notification.model";
import { FRONTEND_URL } from "../utils/constants";

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
        select: "first_name last_name username profile_picture website",
      },
      {
        path: "receiver",
        select: "first_name last_name username profile_picture website",
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
        website: requesterData.website || null,
        initials:
          requesterData.first_name.charAt(0).toUpperCase() +
          requesterData.last_name.charAt(0).toUpperCase(),
      },
      receiver: {
        id: receiverData._id,
        name: `${receiverData.first_name} ${receiverData.last_name}`,
        username: receiverData.username,
        avatarUrl: receiverData.profile_picture || null,
        website: receiverData.website || null,
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

    // Send notification to receiver
    try {
      const exchangeRequestUrl = `${FRONTEND_URL}/@me/exchange-requests`;
      const requesterName = `${requesterData.first_name} ${requesterData.last_name}`;

      await notificationService.sendNotification(
        {
          userId: data.receiverId,
          type: NotificationType.EXCHANGE_REQUEST,
          title: "New Exchange Request",
          message: `${requesterName} wants to exchange skills with you`,
          data: {
            exchangeRequestId: requestData._id.toString(),
          },
        },
        {
          // Email template
          emailSubject: "New Skill Exchange Request - Skill Barter",
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
                          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Skill Barter</h1>
                          <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">New Exchange Request</p>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px;">
                          <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                            Hi <strong>${receiverData.first_name}</strong>,
                          </p>
                          <p style="margin: 0 0 25px; color: #6b7280; font-size: 15px; line-height: 1.6;">
                            Great news! <strong>${requesterName}</strong> wants to exchange skills with you.
                          </p>
                          
                          <!-- Exchange Details Box -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 24px;">
                                <p style="margin: 0 0 16px; color: #374151; font-size: 14px; font-weight: 600;">Exchange Details:</p>
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <span style="color: #6b7280; font-size: 13px;">They want to teach you:</span>
                                      <p style="margin: 4px 0 0; color: #6366f1; font-size: 16px; font-weight: 600;">${requestData.teachingSkill}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <span style="color: #6b7280; font-size: 13px;">They want to learn from you:</span>
                                      <p style="margin: 4px 0 0; color: #8b5cf6; font-size: 16px; font-weight: 600;">${requestData.learningSkill}</p>
                                    </td>
                                  </tr>
                                  ${
                                    requestData.message
                                      ? `
                                  <tr>
                                    <td style="padding: 12px 0 0;">
                                      <span style="color: #6b7280; font-size: 13px;">Message:</span>
                                      <p style="margin: 4px 0 0; color: #374151; font-size: 14px; font-style: italic;">"${requestData.message}"</p>
                                    </td>
                                  </tr>
                                  `
                                      : ""
                                  }
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- CTA Button -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 30px 0; text-align: center;">
                                <a href="${exchangeRequestUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">View Request</a>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                            Don't miss this opportunity to learn something new while sharing your expertise!
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
          // Push notification
          pushTitle: "New Exchange Request 🔄",
          pushBody: `${requesterName} wants to teach you ${requestData.teachingSkill} and learn ${requestData.learningSkill} from you`,
          pushData: {
            type: "exchange_request",
            exchangeRequestId: requestData._id.toString(),
            action: "new",
          },
        },
      );
    } catch (error: any) {
      // Log error but don't fail the request
      console.error(
        "Failed to send exchange request notification:",
        error.message,
      );
    }

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

    // Build filter - only return requests sent TO the current user (receiver)
    const filter: any = {
      receiver: userId,
    };

    // Filter by status if provided
    if (query.status) {
      filter.status = query.status;
    }

    // Get exchange requests
    const exchangeRequests = await ExchangeRequest.find(filter)
      .populate({
        path: "requester",
        select: "first_name last_name username profile_picture website",
      })
      .populate({
        path: "receiver",
        select: "first_name last_name username profile_picture website",
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
          website: requester.website || null,
          initials:
            requester.first_name.charAt(0).toUpperCase() +
            requester.last_name.charAt(0).toUpperCase(),
        },
        receiver: {
          id: receiver._id,
          name: `${receiver.first_name} ${receiver.last_name}`,
          username: receiver.username,
          avatarUrl: receiver.profile_picture || null,
          website: receiver.website || null,
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

    // Create session bookings for both users
    try {
      await sessionBookingService.createSessionBookingsForExchangeRequest(
        requestId,
      );
    } catch (error: any) {
      console.error(
        "Failed to create session bookings after exchange request acceptance:",
        error.message,
      );
    }

    // Create conversation in Firestore for messaging
    try {
      await contactService.createConversation(
        exchangeRequest.requester.toString(),
        userId,
        requestId,
      );
    } catch (error: any) {
      console.error(
        "Failed to create conversation in Firestore after exchange request acceptance:",
        error.message,
      );
    }

    // Populate requester and receiver details
    await exchangeRequest.populate([
      {
        path: "requester",
        select: "first_name last_name username profile_picture website",
      },
      {
        path: "receiver",
        select: "first_name last_name username profile_picture website",
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
        website: requesterData.website || null,
        initials:
          requesterData.first_name.charAt(0).toUpperCase() +
          requesterData.last_name.charAt(0).toUpperCase(),
      },
      receiver: {
        id: receiverData._id,
        name: `${receiverData.first_name} ${receiverData.last_name}`,
        username: receiverData.username,
        avatarUrl: receiverData.profile_picture || null,
        website: receiverData.website || null,
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

    // Send notification to requester
    try {
      const exchangeRequestUrl = `${FRONTEND_URL}/@me/exchange-requests/${requestData._id.toString()}`;
      const receiverName = `${receiverData.first_name} ${receiverData.last_name}`;

      await notificationService.sendNotification(
        {
          userId: requesterData._id.toString(),
          type: NotificationType.EXCHANGE_REQUEST,
          title: "Exchange Request Accepted",
          message: `${receiverName} accepted your exchange request`,
          data: {
            exchangeRequestId: requestData._id.toString(),
          },
        },
        {
          // Email template
          emailSubject: "Your Exchange Request Was Accepted! - Skill Barter",
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
                            <span style="font-size: 32px;">✓</span>
                          </div>
                          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Request Accepted!</h1>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px;">
                          <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                            Hi <strong>${requesterData.first_name}</strong>,
                          </p>
                          <p style="margin: 0 0 25px; color: #6b7280; font-size: 15px; line-height: 1.6;">
                            Great news! <strong>${receiverName}</strong> has accepted your skill exchange request. You can now start scheduling sessions together.
                          </p>
                          
                          <!-- Exchange Details Box -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 24px;">
                                <p style="margin: 0 0 16px; color: #374151; font-size: 14px; font-weight: 600;">Exchange Details:</p>
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <span style="color: #6b7280; font-size: 13px;">You will teach:</span>
                                      <p style="margin: 4px 0 0; color: #059669; font-size: 16px; font-weight: 600;">${requestData.teachingSkill}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <span style="color: #6b7280; font-size: 13px;">You will learn:</span>
                                      <p style="margin: 4px 0 0; color: #10b981; font-size: 16px; font-weight: 600;">${requestData.learningSkill}</p>
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
                                <a href="${exchangeRequestUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">View Details</a>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                            Start by booking your first session and begin your skill exchange journey!
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
          // Push notification
          pushTitle: "Exchange Request Accepted! 🎉",
          pushBody: `${receiverName} accepted your request! You'll teach ${requestData.teachingSkill} and learn ${requestData.learningSkill}`,
          pushData: {
            type: "exchange_request",
            exchangeRequestId: requestData._id.toString(),
            action: "accepted",
          },
        },
      );
    } catch (error: any) {
      // Log error but don't fail the request
      console.error(
        "Failed to send exchange request acceptance notification:",
        error.message,
      );
    }

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
        select: "first_name last_name username profile_picture website",
      },
      {
        path: "receiver",
        select: "first_name last_name username profile_picture website",
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
        website: requesterData.website || null,
        initials:
          requesterData.first_name.charAt(0).toUpperCase() +
          requesterData.last_name.charAt(0).toUpperCase(),
      },
      receiver: {
        id: receiverData._id,
        name: `${receiverData.first_name} ${receiverData.last_name}`,
        username: receiverData.username,
        avatarUrl: receiverData.profile_picture || null,
        website: receiverData.website || null,
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

    // Send notification to requester
    try {
      const receiverName = `${receiverData.first_name} ${receiverData.last_name}`;

      await notificationService.sendNotification(
        {
          userId: requesterData._id.toString(),
          type: NotificationType.EXCHANGE_REQUEST,
          title: "Exchange Request Declined",
          message: `${receiverName} declined your exchange request`,
          data: {
            exchangeRequestId: requestData._id.toString(),
          },
        },
        {
          // Email template
          emailSubject: "Exchange Request Update - Skill Barter",
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
                          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Skill Barter</h1>
                          <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Exchange Request Update</p>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px;">
                          <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                            Hi <strong>${requesterData.first_name}</strong>,
                          </p>
                          <p style="margin: 0 0 25px; color: #6b7280; font-size: 15px; line-height: 1.6;">
                            Unfortunately, <strong>${receiverName}</strong> has declined your skill exchange request.
                          </p>
                          
                          <!-- Exchange Details Box -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="background-color: #f3f4f6; border-radius: 12px; padding: 24px;">
                                <p style="margin: 0 0 16px; color: #374151; font-size: 14px; font-weight: 600;">Request Details:</p>
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <span style="color: #6b7280; font-size: 13px;">Skill to teach:</span>
                                      <p style="margin: 4px 0 0; color: #6b7280; font-size: 16px;">${requestData.teachingSkill}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0;">
                                      <span style="color: #6b7280; font-size: 13px;">Skill to learn:</span>
                                      <p style="margin: 4px 0 0; color: #6b7280; font-size: 16px;">${requestData.learningSkill}</p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Encouragement -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 24px 0;">
                                <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                  Don't be discouraged! There are many other users on Skill Barter who might be interested in exchanging skills with you. Keep exploring and connecting!
                                </p>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- CTA Button -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="text-align: center;">
                                <a href="${FRONTEND_URL}/explore" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">Find More Matches</a>
                              </td>
                            </tr>
                          </table>
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
          // Push notification
          pushTitle: "Exchange Request Declined",
          pushBody: `${receiverName} declined your exchange request. Don't worry, keep exploring!`,
          pushData: {
            type: "exchange_request",
            exchangeRequestId: requestData._id.toString(),
            action: "declined",
          },
        },
      );
    } catch (error: any) {
      // Log error but don't fail the request
      console.error(
        "Failed to send exchange request decline notification:",
        error.message,
      );
    }

    return SuccessResponse({
      message: "Exchange request declined successfully",
      data: formattedRequest,
      httpStatus: StatusCodes.OK,
    });
  }
}

const exchangeRequestService = new ExchangeRequestService();
export default exchangeRequestService;
