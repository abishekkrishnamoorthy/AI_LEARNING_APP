import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { v4 as uuidv4 } from "uuid";
import TempUser from "../models/TempUser.js";
import User from "../models/User.js";
import { sendVerificationEmail } from "../services/emailService.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_MAX_USERS = 10;
const REGISTRATION_LIMIT_MESSAGE =
  "Prototype registration limit has been reached. This demo currently supports only 10 registered users.";

const normalizeEmail = (email) => email.trim().toLowerCase();

const isValidEmail = (email) => EMAIL_REGEX.test(email);
const googleClient = new OAuth2Client();

const getLoginUrl = () => {
  const allowedOrigin = process.env.ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .find(Boolean);
  const frontendBaseUrl =
    process.env.FRONTEND_BASE_URL || allowedOrigin || "http://localhost:5173";
  const loginUrl = new URL("/login", frontendBaseUrl);

  if (!["http:", "https:"].includes(loginUrl.protocol)) {
    throw new Error("FRONTEND_BASE_URL must use HTTP or HTTPS");
  }

  return loginUrl.toString();
};

const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

const sendEmailVerificationSuccess = (res) => {
  const loginUrl = escapeHtml(getLoginUrl());

  return res.status(200).type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Email verified</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; box-sizing: border-box; background: #f7f5fc; color: #302648; font: 16px/1.5 Arial, sans-serif; }
      main { width: min(100%, 420px); box-sizing: border-box; padding: 36px 28px; border: 1px solid #e6e0f2; border-radius: 18px; background: #fff; box-shadow: 0 18px 44px #3026481a; text-align: center; }
      .check { width: 56px; height: 56px; display: grid; place-items: center; margin: 0 auto 16px; border: 2px solid #b2e2bf; border-radius: 50%; background: #eaf9ef; color: #1a9a45; font-size: 30px; }
      h1 { margin: 0; font-size: 26px; }
      p { margin: 12px 0 24px; color: #6c6391; }
      a { display: inline-block; border-radius: 10px; padding: 12px 24px; background: #5f84e8; color: #fff; font-weight: 700; text-decoration: none; }
      a:hover { background: #4e73d9; }
    </style>
  </head>
  <body>
    <main>
      <div class="check" aria-hidden="true">&#10003;</div>
      <h1>Email verified successfully</h1>
      <p>Your account is ready. Continue to login to start learning.</p>
      <a href="${loginUrl}">Go to Login</a>
    </main>
  </body>
</html>`);
};

const getMaxUsers = () => {
  const parsed = Number(process.env.MAX_USERS || DEFAULT_MAX_USERS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_USERS;
};

const getRegistrationAvailability = async () => {
  const maxUsers = getMaxUsers();
  const currentUsers = await User.countDocuments();
  const available = currentUsers < maxUsers;
  return {
    available,
    maxUsers,
    currentUsers,
    ...(available ? {} : { message: REGISTRATION_LIMIT_MESSAGE }),
  };
};

const sendRegistrationLimitResponse = (res) =>
  res.status(403).json({
    message: REGISTRATION_LIMIT_MESSAGE,
  });

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

    const availability = await getRegistrationAvailability();
    if (!availability.available) {
      return sendRegistrationLimitResponse(res);
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
      return sendEmailVerificationSuccess(res);
    }

    const availability = await getRegistrationAvailability();
    if (!availability.available) {
      return sendRegistrationLimitResponse(res);
    }

    await User.create({
      email: tempUser.email,
      password: tempUser.password,
    });

    await TempUser.deleteOne({ _id: tempUser._id });

    return sendEmailVerificationSuccess(res);
  } catch (error) {
    if (error?.code === 11000) {
      return sendEmailVerificationSuccess(res);
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
      const availability = await getRegistrationAvailability();
      if (!availability.available) {
        return sendRegistrationLimitResponse(res);
      }

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

export const registrationAvailability = async (req, res) => {
  try {
    const availability = await getRegistrationAvailability();
    return res.status(200).json(availability);
  } catch (error) {
    return res.status(500).json({ message: "Failed to check registration availability", error: error.message });
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
