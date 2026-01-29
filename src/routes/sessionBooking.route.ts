import { Router } from "express";
import {
  getSessionBookings,
  getSessionBooking,
  updateSessionBooking,
  acceptSessionBooking,
} from "../controllers/sessionBooking.controller";
import {
  GetSessionBookingsSchema,
  UpdateSessionBookingSchema,
  SessionBookingIdSchema,
} from "../validators/sessionBooking.validators";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", GetSessionBookingsSchema, getSessionBookings);
router.get("/:id", SessionBookingIdSchema, getSessionBooking);
router.patch(
  "/:id",
  SessionBookingIdSchema,
  UpdateSessionBookingSchema,
  updateSessionBooking,
);
router.patch("/:id/accept", SessionBookingIdSchema, acceptSessionBooking);

export default router;
