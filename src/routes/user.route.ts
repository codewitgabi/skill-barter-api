import { Router } from "express";
import {
  getUser,
  updateUser,
  deleteUser,
} from "../controllers/user.controller";
import { UpdateUserSchema } from "../validators/user.validators";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// All user routes require authentication
router.use(authenticate);

router.get("/me", getUser);
router.patch("/me", UpdateUserSchema, updateUser);
router.delete("/me", deleteUser);

export default router;
