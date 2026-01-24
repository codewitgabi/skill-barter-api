import { Router } from "express";
import { getSessionBookings } from "../controllers/sessionBooking.controller";
import { GetSessionBookingsSchema } from "../validators/sessionBooking.validators";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", GetSessionBookingsSchema, getSessionBookings);

export default router;
