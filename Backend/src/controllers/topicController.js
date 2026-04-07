import mongoose from "mongoose";
import Cycle from "../models/Cycle.js";
import DailyLog from "../models/DailyLog.js";
import Resource from "../models/Resource.js";
import Topic from "../models/Topic.js";
import { generatePlan } from "../services/planGenerator.js";

const LEVEL_VALUES = ["beginner", "intermediate", "advanced"];
const GOAL_VALUES = ["interview", "competitive", "academic", "project"];
const DAILY_MINUTES_VALUES = [30, 60, 90, 120];

const toError = (res, status, message) => res.status(status).json({ success: false, message });
const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");
const normalizeStatus = (status = "") => String(status).trim().toLowerCase();

const validateCreateTopicInput = ({ name, description, level, goal, durationDays, dailyMinutes }) => {
  if (!name || name.length < 3 || name.length > 80) {
    return "name must be between 3 and 80 characters";
  }

  if (!description || description.length < 20 || description.length > 500) {
    return "description must be between 20 and 500 characters";
  }

  if (!LEVEL_VALUES.includes(level)) {
    return "level must be one of beginner, intermediate, advanced";
  }

  if (!GOAL_VALUES.includes(goal)) {
    return "goal must be one of interview, competitive, academic, project";
  }

  if (!Number.isInteger(durationDays) || durationDays < 5 || durationDays > 180) {
    return "durationDays must be an integer between 5 and 180";
  }

  if (!DAILY_MINUTES_VALUES.includes(dailyMinutes)) {
    return "dailyMinutes must be one of 30, 60, 90, 120";
  }

  return "";
};

const hasUnfinishedNonSummaryTask = (day) =>
  (day?.tasks || [])
    .filter((task) => task?.type !== "summary")
    .some((task) => normalizeStatus(task?.status) !== "done");

const computeCurrentDay = (days = []) => {
  const ordered = [...days].sort((a, b) => Number(a?.dayNumber || 0) - Number(b?.dayNumber || 0));
  const pendingDay = ordered.find((day) => hasUnfinishedNonSummaryTask(day));
  if (pendingDay) return Number(pendingDay.dayNumber) || 1;
  const lastDay = ordered[ordered.length - 1];
  return Number(lastDay?.dayNumber) || 1;
};

const buildTopicSortGroup = (topic) => {
  if (topic.status === "active") return 0;
  if (["pending", "generating", "failed"].includes(topic.status)) return 1;
  if (topic.status === "completed") return 2;
  return 1;
};

const sortTopicsForList = (topics) =>
  [...topics].sort((a, b) => {
    const groupDiff = buildTopicSortGroup(a) - buildTopicSortGroup(b);
    if (groupDiff !== 0) return groupDiff;

    if (a.status === "completed" && b.status === "completed") {
      const aDate = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bDate = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      if (aDate !== bDate) return bDate - aDate;
    }

    const aUpdated = new Date(a.updatedAt).getTime();
    const bUpdated = new Date(b.updatedAt).getTime();
    return bUpdated - aUpdated;
  });

export const createTopic = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return toError(res, 401, "Unauthorized");
    }

    const activePendingCount = await Topic.countDocuments({
      userId,
      status: { $in: ["active", "pending", "generating"] },
    });

    if (activePendingCount >= 3) {
      return toError(res, 400, "Delete a topic to add another");
    }

    const {
      name: rawName,
      description: rawDescription,
      level: rawLevel,
      goal: rawGoal,
      durationDays: rawDurationDays,
      dailyMinutes: rawDailyMinutes,
    } = req.body || {};

    const name = normalizeText(rawName);
    const description = normalizeText(rawDescription);
    const level = normalizeText(rawLevel);
    const goal = normalizeText(rawGoal);
    const durationDays = Number(rawDurationDays);
    const dailyMinutes = Number(rawDailyMinutes);

    const validationError = validateCreateTopicInput({
      name,
      description,
      level,
      goal,
      durationDays,
      dailyMinutes,
    });
    if (validationError) {
      return toError(res, 400, validationError);
    }

    const topic = await Topic.create({
      userId,
      name,
      description,
      level,
      goal,
      durationDays,
      dailyMinutes,
      status: "generating",
      totalCycles: Math.ceil(durationDays / 5),
      planError: "",
    });

    generatePlan(topic._id.toString()).catch(async (error) => {
      try {
        await Topic.findByIdAndUpdate(topic._id, {
          status: "failed",
          planError: error?.message || "Plan generation failed",
        });
      } catch (updateError) {
        console.error("Failed to update topic after generation error:", updateError);
      }
      console.error("Plan generation failed:", error);
    });

    return res.status(201).json({
      success: true,
      data: {
        topicId: topic._id,
        status: "generating",
      },
    });
  } catch (error) {
    if (error?.name === "ValidationError") {
      const firstMessage = Object.values(error.errors || {})[0]?.message || "Invalid topic input";
      return toError(res, 400, firstMessage);
    }

    return toError(res, 500, "Failed to create topic");
  }
};

export const getTopicStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return toError(res, 401, "Unauthorized");
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return toError(res, 404, "Topic not found");
    }

    const topic = await Topic.findOne({ _id: id, userId, status: { $ne: "deleted" } }).select("status");
    if (!topic) {
      return toError(res, 404, "Topic not found");
    }

    return res.status(200).json({
      success: true,
      data: {
        status: topic.status,
      },
    });
  } catch (_error) {
    return toError(res, 500, "Failed to fetch topic status");
  }
};

export const retryTopicPlan = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return toError(res, 401, "Unauthorized");
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return toError(res, 404, "Topic not found");
    }

    const topic = await Topic.findOne({ _id: id, userId, status: { $ne: "deleted" } });
    if (!topic) {
      return toError(res, 404, "Topic not found");
    }

    if (topic.status !== "failed") {
      return toError(res, 400, "Only failed topics can be retried");
    }

    topic.status = "generating";
    topic.planError = "";
    await topic.save();

    generatePlan(topic._id.toString()).catch(async (error) => {
      try {
        await Topic.findByIdAndUpdate(topic._id, {
          status: "failed",
          planError: error?.message || "Plan generation failed",
        });
      } catch (updateError) {
        console.error("Failed to update topic after retry error:", updateError);
      }
      console.error("Plan retry failed:", error);
    });

    return res.status(200).json({ success: true, message: "Retrying plan generation" });
  } catch (_error) {
    return toError(res, 500, "Failed to retry topic plan");
  }
};

export const getTopics = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return toError(res, 401, "Unauthorized");
    }

    const topics = await Topic.find({
      userId,
      status: { $nin: ["deleted"] },
    })
      .select(
        "_id name description level goal durationDays dailyMinutes status bannerIndex completionPercent totalCycles planError currentCycleId createdAt updatedAt completedAt"
      )
      .lean();

    const withCycle = await Promise.all(
      topics.map(async (topic) => {
        let currentCycle = null;
        if (topic.status === "active") {
          const cycle =
            (await Cycle.findOne({
              topicId: topic._id,
              status: "in_progress",
            })
              .select("_id cycleNumber days")
              .lean()) ||
            (topic.currentCycleId
              ? await Cycle.findOne({
                  _id: topic.currentCycleId,
                  topicId: topic._id,
                })
                  .select("_id cycleNumber days")
                  .lean()
              : null);

          if (cycle) {
            currentCycle = {
              cycleId: cycle._id,
              cycleNumber: Number(cycle.cycleNumber) || 1,
              currentDay: computeCurrentDay(cycle.days || []),
            };
          }
        }

        return {
          _id: topic._id,
          name: topic.name,
          description: topic.description || "",
          level: topic.level,
          goal: topic.goal,
          durationDays: topic.durationDays,
          dailyMinutes: topic.dailyMinutes,
          status: topic.status,
          bannerIndex: Number(topic.bannerIndex) || 0,
          completionPercent: Number(topic.completionPercent) || 0,
          totalCycles: Number(topic.totalCycles) || 0,
          planError: topic.planError || "",
          currentCycle,
          createdAt: topic.createdAt,
          completedAt: topic.completedAt || null,
        };
      })
    );

    return res.status(200).json({ success: true, data: sortTopicsForList(withCycle) });
  } catch (_error) {
    return toError(res, 500, "Failed to fetch topics");
  }
};

export const getTopicById = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return toError(res, 401, "Unauthorized");
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return toError(res, 404, "Topic not found");
    }

    const topic = await Topic.findOne({ _id: id, userId, status: { $ne: "deleted" } });
    if (!topic) {
      return toError(res, 404, "Topic not found");
    }

    return res.status(200).json({ success: true, data: topic });
  } catch (_error) {
    return toError(res, 500, "Failed to fetch topic");
  }
};

export const deleteTopic = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return toError(res, 401, "Unauthorized");
    }

    const topicId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ error: "Invalid topic ID" });
    }

    const topic = await Topic.findOne({
      _id: topicId,
      userId,
    });

    if (!topic) {
      return res.status(404).json({
        error: "Topic not found or you do not have permission to delete it",
      });
    }

    if (topic.status === "completed") {
      return res.status(403).json({ error: "Completed topics cannot be deleted" });
    }

    const dailyLogResult = await DailyLog.deleteMany({ topicId });
    const resourceResult = await Resource.deleteMany({ topicId });
    const cycleResult = await Cycle.deleteMany({ topicId });
    await Topic.findByIdAndDelete(topicId);

    return res.status(200).json({
      message: "Topic and all linked data deleted successfully",
      deleted: {
        topic: topic.name,
        cycles: cycleResult.deletedCount,
        dailyLogs: dailyLogResult.deletedCount,
        resources: resourceResult.deletedCount,
      },
    });
  } catch (error) {
    console.error("Delete topic error:", error);
    return res.status(500).json({
      error: "Server error during deletion",
      detail: error.message,
    });
  }
};
