import { Router } from "express";
import {
  getUser,
  updateUser,
  deleteUser,
  getQuickStats,
} from "../controllers/user.controller";
import { UpdateUserSchema } from "../validators/user.validators";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// All user routes require authentication
router.use(authenticate);

router.get("/me", getUser);
router.get("/me/stats", getQuickStats);
router.patch("/me", UpdateUserSchema, updateUser);
router.delete("/me", deleteUser);

export default router;
