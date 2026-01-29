import { Router } from "express";
import {
  getUser,
  updateUser,
  deleteUser,
  getQuickStats,
  changePassword,
} from "../controllers/user.controller";
import {
  UpdateUserSchema,
  ChangePasswordSchema,
} from "../validators/user.validators";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// All user routes require authentication
router.use(authenticate);

router.get("/me", getUser);
router.get("/me/stats", getQuickStats);
router.patch("/me", UpdateUserSchema, updateUser);
router.delete("/me", deleteUser);
router.post("/me/change-password", ChangePasswordSchema, changePassword);

export default router;
