import { Router } from "express";
import {
  getSessionBookings,
  updateSessionBooking,
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
router.patch(
  "/:id",
  SessionBookingIdSchema,
  UpdateSessionBookingSchema,
  updateSessionBooking,
);

export default router;
