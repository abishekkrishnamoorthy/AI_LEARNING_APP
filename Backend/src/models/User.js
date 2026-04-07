import mongoose from "mongoose";

const profilePreferencesSchema = new mongoose.Schema(
  {
    weeklyDays: {
      type: [String],
      default: [],
    },
    studyTimeSlot: {
      type: String,
      enum: ["forenoon", "afternoon", "evening"],
    },
    notificationChannel: {
      type: String,
      default: "email",
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
  },
  oauthId: {
    type: String,
  },
  oauthProvider: {
    type: String,
  },
  name: {
    type: String,
    trim: true,
  },
  gender: {
    type: String,
    trim: true,
  },
  dob: {
    type: Date,
  },
  interests: {
    type: String,
    trim: true,
  },
  interestsList: {
    type: [String],
    default: [],
  },
  availableTime: {
    type: String,
    trim: true,
  },
  profilePic: {
    type: String,
  },
  isProfileComplete: {
    type: Boolean,
    default: false,
  },
  preferences: {
    type: profilePreferencesSchema,
    default: () => ({ weeklyDays: [], studyTimeSlot: "forenoon", notificationChannel: "email" }),
  },
  topics: {
    type: Array,
  },
  lastLogin: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);

export default User;
