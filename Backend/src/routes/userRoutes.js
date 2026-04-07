import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import { deleteUser, getUser, updateProfile } from "../controllers/userController.js";

const router = express.Router();

router.get("/me", authMiddleware, getUser);
router.put("/profile", authMiddleware, updateProfile);
router.delete("/delete", authMiddleware, deleteUser);

export default router;

