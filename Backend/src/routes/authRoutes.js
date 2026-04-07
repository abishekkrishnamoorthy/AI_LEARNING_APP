import express from "express";
import {
  checkVerifyStatus,
  getCurrentUser,
  loginUser,
  logoutUser,
  oauthLogin,
  registerUser,
  resendVerificationEmail,
  verifyEmail,
} from "../controllers/authController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.get("/verify", verifyEmail);
router.post("/login", loginUser);
router.post("/oauth", oauthLogin);
router.get("/me", authMiddleware, getCurrentUser);
router.get("/check-verify", checkVerifyStatus);
router.get("/checkstatus", checkVerifyStatus);
router.post("/resend", resendVerificationEmail);
router.post("/logout", logoutUser);

export default router;
