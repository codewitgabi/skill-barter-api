export type IErrorStatus = 400 | 401 | 403 | 404 | 405 | 500;
export type IErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RESOURCE_NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "INTERNAL_SERVER_ERROR";

const errorCodes = {
  400: "INVALID_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "RESOURCE_NOT_FOUND",
  405: "METHOD_NOT_ALLOWED",
  500: "INTERNAL_SERVER_ERROR",
};

export default errorCodes;
