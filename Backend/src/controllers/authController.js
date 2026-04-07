import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { v4 as uuidv4 } from "uuid";
import TempUser from "../models/TempUser.js";
import User from "../models/User.js";
import { sendVerificationEmail } from "../services/emailService.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email) => email.trim().toLowerCase();

const isValidEmail = (email) => EMAIL_REGEX.test(email);
const googleClient = new OAuth2Client();

const toUserResponse = (user) => ({
  id: user._id,
  email: user.email,
  name: user.name,
  gender: user.gender,
  dob: user.dob,
  interests: user.interests,
  availableTime: user.availableTime,
  profilePic: user.profilePic,
  isProfileComplete: user.isProfileComplete,
  preferences: user.preferences,
  topics: user.topics,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
});

export const registerUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "A valid email is required" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();

    await TempUser.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        password: hashedPassword,
        token: verificationToken,
        createdAt: new Date(),
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    try {
      await sendVerificationEmail(normalizedEmail, verificationToken);
    } catch (emailError) {
      console.error("[registerUser] Brevo API send failed", {
        code: emailError?.code,
        errno: emailError?.errno,
        responseCode: emailError?.responseCode,
        status: emailError?.status,
        responseBody: emailError?.responseBody,
        causeCode: emailError?.cause?.code,
        message: emailError?.message,
      });

      return res.status(500).json({
        message:
          "Registration data saved, but verification email could not be sent due to email provider API issue.",
        emailProvider: "brevo",
        smtpError: false,
      });
    }

    return res.status(201).json({ message: "Check email to verify" });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed", error: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const tempUser = await TempUser.findOne({ token });

    if (!tempUser) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    const existingUser = await User.findOne({ email: tempUser.email });
    if (existingUser) {
      await TempUser.deleteOne({ _id: tempUser._id });
      return res.status(200).json({ message: "Email verified successfully" });
    }

    await User.create({
      email: tempUser.email,
      password: tempUser.password,
    });

    await TempUser.deleteOne({ _id: tempUser._id });

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(200).json({ message: "Email verified successfully" });
    }
    return res.status(500).json({ message: "Email verification failed", error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    // Login contract (v1):
    // POST /auth/login
    // Request: { email, password }
    // Success: { message, token, user }
    // Auth transport for protected APIs: Authorization: Bearer <token>
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET is not configured" });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "A valid email is required" });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: toUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed", error: error.message });
  }
};

export const oauthLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential || typeof credential !== "string") {
      return res.status(400).json({ message: "credential is required" });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: "GOOGLE_CLIENT_ID is not configured" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET is not configured" });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired Google credential" });
    }

    const email = payload?.email ? normalizeEmail(payload.email) : "";
    const oauthId = payload?.sub;
    const profilePic = payload?.picture;

    if (!email || !oauthId) {
      return res.status(400).json({ message: "Google payload is missing required fields" });
    }

    let user = await User.findOne({ email });

    if (user) {
      user.lastLogin = new Date();
      await user.save();
    } else {
      user = await User.create({
        email,
        oauthProvider: "google",
        oauthId,
        profilePic,
        lastLogin: new Date(),
      });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "OAuth login successful",
      token,
      user: toUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "OAuth login failed", error: error.message });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "_id email name gender dob interests availableTime profilePic isProfileComplete preferences topics lastLogin createdAt"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user: {
        ...toUserResponse(user),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch user profile", error: error.message });
  }
};

export const checkVerifyStatus = async (req, res) => {
  try {
    // Contract: status is derived from collection membership.
    // - verified: email exists in User
    // - pending: email exists in TempUser only
    // - not_found: email exists in neither collection
    const email = req.headers["x-user-email"];

    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "x-user-email header is required" });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "A valid email is required" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (user) {
      return res.status(200).json({ verified: true, status: "verified" });
    }

    const tempUser = await TempUser.findOne({ email: normalizedEmail });
    if (tempUser) {
      return res.status(200).json({ verified: false, status: "pending" });
    }

    return res.status(200).json({ verified: false, status: "not_found" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to check verification", error: error.message });
  }
};

export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "A valid email is required" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: "Email is already verified" });
    }

    const tempUser = await TempUser.findOne({ email: normalizedEmail });
    if (!tempUser) {
      return res.status(404).json({ message: "No pending verification found for this email" });
    }

    const verificationToken = uuidv4();
    tempUser.token = verificationToken;
    tempUser.createdAt = new Date();
    await tempUser.save();

    try {
      await sendVerificationEmail(normalizedEmail, verificationToken);
    } catch (emailError) {
      console.error("[resendVerificationEmail] Brevo API send failed", {
        code: emailError?.code,
        errno: emailError?.errno,
        responseCode: emailError?.responseCode,
        status: emailError?.status,
        responseBody: emailError?.responseBody,
        causeCode: emailError?.cause?.code,
        message: emailError?.message,
      });
      return res.status(500).json({
        message: "Verification email could not be resent due to email provider API issue.",
      });
    }

    return res.status(200).json({ message: "Verification email resent" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to resend verification email", error: error.message });
  }
};

export const logoutUser = async (req, res) => {
  return res.status(200).json({ message: "Logout successful" });
};
