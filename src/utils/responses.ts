import { StatusCodes } from "http-status-codes";

interface ISuccessResponse {
  status?: "success";
  message: string;
  data?: unknown;
  httpStatus?: number;
}

export const SuccessResponse = ({
  status = "success",
  message,
  data = {},
  httpStatus = StatusCodes.OK,
}: ISuccessResponse) => {
  return {
    status,
    message,
    data,
    httpStatus,
  };
};
