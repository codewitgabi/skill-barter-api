import { NextFunction, Response, Request } from "express";
import sysLogger from "./logger";

const catchAsync =
  <T>(
    controller: (req: Request, res: Response, next: NextFunction) => Promise<T>,
  ) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await controller(req, res, next);
    } catch (error: unknown) {
      sysLogger.error(
        `Error: ${error instanceof Error ? error.message : error}`,
      );
      next(error);
    }
  };

export default catchAsync;
