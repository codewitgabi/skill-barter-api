import { Router } from "express";
import {
  getUser,
  updateUser,
  deleteUser,
  getQuickStats,
  changePassword,
  getUserProfile,
} from "../controllers/user.controller";
import {
  UpdateUserSchema,
  ChangePasswordSchema,
  UserIdParamSchema,
} from "../validators/user.validators";
import {
  authenticate,
  optionalAuthenticate,
} from "../middlewares/auth.middleware";

const router = Router();

// Public routes with optional authentication (for connection status)
router.get(
  "/:userId/profile",
  optionalAuthenticate,
  UserIdParamSchema,
  getUserProfile,
);

// Protected routes (authentication required)
router.use(authenticate);

router.get("/me", getUser);
router.get("/me/stats", getQuickStats);
router.patch("/me", UpdateUserSchema, updateUser);
router.delete("/me", deleteUser);
router.post("/me/change-password", ChangePasswordSchema, changePassword);

export default router;
