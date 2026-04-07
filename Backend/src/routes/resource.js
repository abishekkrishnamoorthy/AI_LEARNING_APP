import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import Cycle from "../models/Cycle.js";
import Resource from "../models/Resource.js";

const router = express.Router();

router.get("/video/:cycleId/:dayNumber", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { cycleId, dayNumber } = req.params;
    const parsedDayNumber = Number(dayNumber);

    const cycle = await Cycle.findOne({ _id: cycleId, userId }).lean();
    if (!cycle) {
      return res.status(404).json({ success: false, message: "Cycle not found" });
    }

    const day = (cycle.days || []).find((item) => Number(item.dayNumber) === parsedDayNumber);
    if (!day) {
      return res.status(404).json({ success: false, message: "Day not found" });
    }

    const videoTask = (day.tasks || []).find((task) => task.type === "video");
    let videoData = null;

    if (videoTask?.videoId) {
      videoData = await Resource.findOne({ videoId: videoTask.videoId })
        .sort({ updatedAt: -1 })
        .lean();
      if (!videoData) {
        videoData = { videoId: videoTask.videoId };
      }
    } else {
      videoData = await Resource.findOne({
        subtopicTitle: day.subtopicRef,
        type: "video",
      }).lean();
    }

    if (!videoData?.videoId) {
      return res.status(404).json({ success: false, message: "Video resource not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        videoId: videoData.videoId,
        title: videoData.title || null,
        channelName: videoData.channelName || null,
        durationSec: videoData.durationSec || null,
        thumbnailUrl: videoData.thumbnailUrl || null,
      },
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Failed to fetch video resource" });
  }
});

export default router;

