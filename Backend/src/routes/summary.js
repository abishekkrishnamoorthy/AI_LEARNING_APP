import express from "express";
import mongoose from "mongoose";
import authMiddleware from "../middlewares/authMiddleware.js";
import DailyLog from "../models/DailyLog.js";
import { generateSummary } from "../services/summaryGenerator.js";

const router = express.Router();

router.post("/generate", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { dailyLogId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(dailyLogId)) {
      return res.status(400).json({ success: false, message: "Invalid dailyLogId" });
    }

    const log = await DailyLog.findOne({ _id: dailyLogId, userId }).select("_id");
    if (!log) {
      return res.status(404).json({ success: false, message: "Daily log not found" });
    }

    generateSummary(String(dailyLogId)).catch((error) => {
      console.error("Summary generation failed:", error);
    });

    return res.status(202).json({ success: true, data: { status: "generating" } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to enqueue summary" });
  }
});

router.get("/:dailyLogId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { dailyLogId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(dailyLogId)) {
      return res.status(400).json({ success: false, message: "Invalid dailyLogId" });
    }

    const log = await DailyLog.findOne({ _id: dailyLogId, userId }).select("summary quiz depthQuestion");
    if (!log) {
      return res.status(404).json({ success: false, message: "Daily log not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...(log.summary || {}),
        quizScore: Number(log.quiz?.score || 0),
        depthScore: Number(log.depthQuestion?.depth || log.depthQuestion?.score || 0),
      },
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Failed to fetch summary" });
  }
});

export default router;
