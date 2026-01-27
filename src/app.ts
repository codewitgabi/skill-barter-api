import express, { Express, Request, Response } from "express";
import logger from "morgan";
import connectDb from "./config/db.config";
import {
  RequestErrorHandler,
  NotFoundErrorHandler,
} from "./middlewares/errors.handler";
import cors from "cors";
import { SuccessResponse } from "./utils/responses";
import { StatusCodes } from "http-status-codes";
import compression from "compression";
import sysLogger from "./utils/logger";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import authRoutes from "./routes/auth.route";
import userRoutes from "./routes/user.route";
import notificationSettingsRoutes from "./routes/notificationSettings.route";
import connectionRoutes from "./routes/connection.route";
import exchangeRequestRoutes from "./routes/exchangeRequest.route";
import sessionBookingRoutes from "./routes/sessionBooking.route";
import sessionRoutes from "./routes/session.route";
import statsRoutes from "./routes/stats.route";

const app: Express = express();

const corsOrigin = [
  "http://localhost:3000",
  "https://localhost:3000",
  "http://localhost:3001",
];

app.use(
  cors({
    origin: corsOrigin,
  }),
);

const rateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

app.use(rateLimiter);
app.use(helmet());
app.use(logger("combined"));
app.set("port", process.env.PORT || 7000);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Routes

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/notification-settings", notificationSettingsRoutes);
app.use("/api/v1/connections", connectionRoutes);
app.use("/api/v1/exchange-requests", exchangeRequestRoutes);
app.use("/api/v1/session-bookings", sessionBookingRoutes);
app.use("/api/v1/sessions", sessionRoutes);
app.use("/api/v1/stats", statsRoutes);

app.get("/", (req: Request, res: Response) => {
  const response = SuccessResponse({
    status: "success",
    message: "Welcome to Skill Barter API",
    data: null,
  });

  res.status(StatusCodes.OK).json(response);
});

// Middlewares

app.use(NotFoundErrorHandler);
app.use(RequestErrorHandler);

// Start server using IIFE

(() => {
  connectDb()
    .then(() => {
      sysLogger.info("Database connection successful");

      app.listen(app.get("port"), () => {
        sysLogger.info(`Server is running on port ${app.get("port")}`);
      });
    })
    .catch((e) => {
      sysLogger.error(`An error occurred connecting to database: ${e}`);
    });
})();
