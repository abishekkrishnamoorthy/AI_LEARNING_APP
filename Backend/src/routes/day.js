import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import Resource from "../models/Resource.js";
import {
  findCycleAndDay,
  getDayType,
  getExpectedTaskTypes,
  getOrCreateDailyLog,
  normalizeTaskList,
  syncDayTasksWithPolicy,
} from "../services/dailyExecutionService.js";

const router = express.Router();

router.get("/:cycleId/:dayNumber", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { cycleId, dayNumber } = req.params;
    const parsedDay = Number(dayNumber);

    if (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 5) {
      return res.status(400).json({ success: false, message: "dayNumber must be between 1 and 5" });
    }

    const { cycle, day, topic } = await findCycleAndDay({ cycleId, dayNumber: parsedDay, userId });
    const dayType = getDayType({ dayNumber: parsedDay, level: topic.level });
    const expectedTasks = getExpectedTaskTypes({ dayNumber: parsedDay, level: topic.level });

    syncDayTasksWithPolicy({ day, expectedTypes: expectedTasks });
    await cycle.save();

    const dailyLog = await getOrCreateDailyLog({ cycle, dayNumber: parsedDay, userId });

    const resource = await Resource.findOne({ cycleId: cycle._id, dayNumber: parsedDay }).lean();
    const taskVideoId = day.tasks.find((task) => task.type === "video")?.videoId || null;
    const videoResource = taskVideoId
      ? await Resource.findOne({ videoId: taskVideoId }).sort({ updatedAt: -1 }).lean()
      : await Resource.findOne({ subtopicTitle: day.subtopicRef, type: "video", level: topic.level }).lean();
    const normalizedTasks = normalizeTaskList(day.tasks).map((task) => ({
      type: task.type,
      status: task.status,
    }));

    return res.status(200).json({
      success: true,
      data: {
        dailyLogId: dailyLog._id,
        videoProgress: {
          percent: Number(dailyLog.videoProgress?.percent) || 0,
          currentTime: Number(dailyLog.videoProgress?.currentTime) || 0,
          duration: Number(dailyLog.videoProgress?.duration) || 0,
          videoId: dailyLog.videoProgress?.videoId || null,
          ended: Boolean(dailyLog.videoProgress?.ended),
          completed: Boolean(dailyLog.videoProgress?.completed),
          completedAt: dailyLog.videoProgress?.completedAt || null,
        },
        dayType,
        subtopic: day.subtopicRef || resource?.subtopicTitle || "Assessment",
        tasks: normalizedTasks,
        videoId: taskVideoId || videoResource?.videoId || resource?.videoId || null,
        videoTitle: videoResource?.title || resource?.title || null,
        channelName: videoResource?.channelName || resource?.channelName || null,
        questions: resource?.questions || [],
        depthQuestion:
          resource?.depthQuestion || day.tasks.find((task) => task.type === "depth")?.depthQuestion || null,
        practicalTask: resource?.practicalTask || {
          type: day.tasks.find((task) => task.type === "practical")?.practicalType || null,
          prompt: day.tasks.find((task) => task.type === "practical")?.practicalPrompt || null,
          starterCode: day.tasks.find((task) => task.type === "practical")?.starterCode || "",
        },
      },
    });
  } catch (error) {
    const status = error.message?.includes("not found") ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message || "Failed to fetch day" });
  }
});

export default router;
