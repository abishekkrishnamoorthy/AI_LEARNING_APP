import express from "express";
import mongoose from "mongoose";
import authMiddleware from "../middlewares/authMiddleware.js";
import DailyLog from "../models/DailyLog.js";

const router = express.Router();

router.get("/:dailyLogId", authMiddleware, async (req, res) => {
  try {
    const { dailyLogId } = req.params;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(dailyLogId)) {
      return res.status(400).json({ success: false, message: "Invalid dailyLogId" });
    }

    const log = await DailyLog.findOne({ _id: dailyLogId, userId }).select("notes");
    if (!log) {
      return res.status(404).json({ success: false, message: "Daily log not found" });
    }

    return res.status(200).json({ success: true, data: { content: log.notes?.content || "" } });
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Failed to fetch notes" });
  }
});

router.put("/:dailyLogId", authMiddleware, async (req, res) => {
  try {
    const { dailyLogId } = req.params;
    const userId = req.user?.id;
    const content = String(req.body?.content || "");

    if (!mongoose.Types.ObjectId.isValid(dailyLogId)) {
      return res.status(400).json({ success: false, message: "Invalid dailyLogId" });
    }

    const log = await DailyLog.findOneAndUpdate(
      { _id: dailyLogId, userId },
      {
        $set: {
          notes: {
            content,
            updatedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!log) {
      return res.status(404).json({ success: false, message: "Daily log not found" });
    }

    return res.status(200).json({ success: true, data: { content: log.notes?.content || "" } });
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Failed to save notes" });
  }
});

export default router;
