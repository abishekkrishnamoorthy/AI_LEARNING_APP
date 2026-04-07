import User from "../models/User.js";

const WEEKDAY_VALUES = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const STUDY_TIME_SLOT_VALUES = ["forenoon", "afternoon", "evening"];
const DEFAULT_NOTIFICATION_CHANNEL = "email";

const toLabel = (value = "") => value.charAt(0).toUpperCase() + value.slice(1);

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");

const parseInterestsList = (rawValue) => {
  if (!Array.isArray(rawValue)) {
    return null;
  }

  const cleaned = rawValue
    .map((item) => normalizeText(item).toLowerCase())
    .filter(Boolean);

  return [...new Set(cleaned)];
};

const parseWeeklyDays = (rawValue) => {
  if (!Array.isArray(rawValue)) {
    return null;
  }

  const cleaned = rawValue
    .map((item) => normalizeText(item).toLowerCase())
    .filter(Boolean);

  const unique = [...new Set(cleaned)];
  const areValid = unique.every((day) => WEEKDAY_VALUES.includes(day));
  if (!areValid) {
    return null;
  }

  return WEEKDAY_VALUES.filter((weekday) => unique.includes(weekday));
};

const parseStudyTimeSlot = (rawValue) => {
  const value = normalizeText(rawValue).toLowerCase();
  if (!value || !STUDY_TIME_SLOT_VALUES.includes(value)) {
    return null;
  }
  return value;
};

const validateDob = (rawDob) => {
  if (rawDob === undefined || rawDob === null || rawDob === "") {
    return { valid: true, value: null };
  }

  const parsed = new Date(rawDob);
  if (Number.isNaN(parsed.getTime())) {
    return { valid: false, error: "Date of birth must be a valid date." };
  }

  const now = new Date();
  if (parsed > now) {
    return { valid: false, error: "Date of birth cannot be in the future." };
  }

  return { valid: true, value: parsed };
};

const formatAvailableTime = (weeklyDays, studyTimeSlot) => {
  if (!Array.isArray(weeklyDays) || weeklyDays.length === 0 || !studyTimeSlot) {
    return "";
  }

  const dayLabels = weeklyDays.map((day) => toLabel(day));
  return `${dayLabels.join(", ")} (${toLabel(studyTimeSlot)})`;
};

const normalizePreferences = (preferences) => {
  const weeklyDays = parseWeeklyDays(preferences?.weeklyDays) || [];
  const studyTimeSlot = parseStudyTimeSlot(preferences?.studyTimeSlot) || "";

  return {
    weeklyDays,
    studyTimeSlot,
    notificationChannel: DEFAULT_NOTIFICATION_CHANNEL,
  };
};

const toUserResponse = (user) => ({
  id: user._id,
  email: user.email,
  name: user.name,
  gender: user.gender,
  dob: user.dob,
  interests: user.interests,
  interestsList: Array.isArray(user.interestsList) ? user.interestsList : [],
  availableTime: user.availableTime,
  profilePic: user.profilePic,
  isProfileComplete: user.isProfileComplete,
  preferences: normalizePreferences(user.preferences),
  topics: user.topics,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
});

export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user: toUserResponse(user) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch user", error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, gender, dob, interests, availableTime, interestsList, preferences, profilePic } =
      req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isSetupFlow = !user.isProfileComplete;

    const nextName = normalizeText(name ?? user.name);
    if (!nextName) {
      return res.status(400).json({ message: "Name is required." });
    }

    const dobValidation = validateDob(dob !== undefined ? dob : user.dob);
    if (!dobValidation.valid) {
      return res.status(400).json({ message: dobValidation.error });
    }

    if (interestsList !== undefined && !Array.isArray(interestsList)) {
      return res.status(400).json({ message: "interestsList must be an array." });
    }

    let parsedInterestsList = parseInterestsList(interestsList);
    if (!parsedInterestsList && Array.isArray(user.interestsList)) {
      parsedInterestsList = [...new Set(user.interestsList.map((item) => normalizeText(item).toLowerCase()).filter(Boolean))];
    }

    if (isSetupFlow && (!Array.isArray(parsedInterestsList) || parsedInterestsList.length === 0)) {
      return res.status(400).json({ message: "Select at least one interest." });
    }

    let parsedWeeklyDays = parseWeeklyDays(preferences?.weeklyDays);
    let parsedStudyTimeSlot = parseStudyTimeSlot(preferences?.studyTimeSlot);

    if (!parsedWeeklyDays && Array.isArray(user.preferences?.weeklyDays)) {
      parsedWeeklyDays = parseWeeklyDays(user.preferences.weeklyDays) || [];
    }

    if (!parsedStudyTimeSlot && user.preferences?.studyTimeSlot) {
      parsedStudyTimeSlot = parseStudyTimeSlot(user.preferences.studyTimeSlot) || "";
    }

    if (isSetupFlow && (!parsedWeeklyDays || parsedWeeklyDays.length === 0)) {
      return res.status(400).json({ message: "Select at least one weekly availability day." });
    }

    if (isSetupFlow && !parsedStudyTimeSlot) {
      return res.status(400).json({ message: "Select a valid study time slot." });
    }

    if (preferences && !Array.isArray(preferences.weeklyDays)) {
      return res.status(400).json({ message: "preferences.weeklyDays must be an array." });
    }

    if (preferences && preferences.studyTimeSlot !== undefined && !parsedStudyTimeSlot) {
      return res.status(400).json({ message: "preferences.studyTimeSlot must be forenoon, afternoon, or evening." });
    }

    if (preferences && Array.isArray(preferences.weeklyDays) && !parsedWeeklyDays) {
      return res.status(400).json({ message: "preferences.weeklyDays contains invalid values." });
    }

    if (preferences && Array.isArray(preferences.weeklyDays) && parsedWeeklyDays?.length === 0) {
      return res.status(400).json({ message: "Select at least one weekly availability day." });
    }

    user.name = nextName;
    user.gender = gender !== undefined ? normalizeText(gender) : user.gender;
    user.dob = dobValidation.value;

    if (Array.isArray(parsedInterestsList) && parsedInterestsList.length > 0) {
      user.interestsList = parsedInterestsList;
      user.interests = parsedInterestsList.join(", ");
    } else if (interests !== undefined) {
      user.interests = normalizeText(interests);
    }

    const nextPreferences = {
      weeklyDays: parsedWeeklyDays || [],
      studyTimeSlot: parsedStudyTimeSlot || "",
      notificationChannel: DEFAULT_NOTIFICATION_CHANNEL,
    };

    if (nextPreferences.weeklyDays.length > 0 && nextPreferences.studyTimeSlot) {
      user.preferences = nextPreferences;
      user.availableTime = formatAvailableTime(nextPreferences.weeklyDays, nextPreferences.studyTimeSlot);
    } else if (availableTime !== undefined) {
      user.availableTime = normalizeText(availableTime);
    }

    user.profilePic = profilePic !== undefined ? normalizeText(profilePic) : user.profilePic;
    user.isProfileComplete = true;

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      user: toUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.deleteOne({ _id: req.user.userId });
    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete account", error: error.message });
  }
};
