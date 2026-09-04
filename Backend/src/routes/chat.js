import express from "express";
import mongoose from "mongoose";
import authMiddleware from "../middlewares/authMiddleware.js";
import Cycle from "../models/Cycle.js";
import DailyLog from "../models/DailyLog.js";
import Topic from "../models/Topic.js";
import { getGroqClient, getGroqModel } from "../services/groqService.js";

const router = express.Router();

router.post("/message", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { dailyLogId, message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(dailyLogId)) {
      return res.status(400).json({ success: false, message: "Invalid dailyLogId" });
    }

    const normalizedMessage = String(message || "").trim();
    if (!normalizedMessage) {
      return res.status(400).json({ success: false, message: "message is required" });
    }

    const dailyLog = await DailyLog.findOne({ _id: dailyLogId, userId });
    if (!dailyLog) {
      return res.status(404).json({ success: false, message: "Daily log not found" });
    }

    const cycle = await Cycle.findById(dailyLog.cycleId);
    const topic = await Topic.findById(dailyLog.topicId).select("level");
    const day = cycle?.days?.find((item) => Number(item.dayNumber) === Number(dailyLog.dayNumber));
    const subtopic = day?.subtopicRef || "today's learning topic";
    const level = topic?.level || "beginner";

    const prior = Array.isArray(dailyLog.aiChatHistory) ? dailyLog.aiChatHistory.slice(-8) : [];

    const messages = [
      {
        role: "system",
        content: `You are a focused learning assistant for LearnOS.\nToday's topic: ${subtopic}.\nSTRICT RULE: Only answer questions directly about '${subtopic}'.\nIf the user asks about anything else, respond: \"I can only help with ${subtopic} today. Ask me something about that!\"\nBe concise, clear, and helpful for a ${level} level student.`,
      },
      ...prior.map((item) => ({ role: item.role, content: item.content })),
      { role: "user", content: normalizedMessage },
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    await DailyLog.updateOne(
      { _id: dailyLogId },
      {
        $push: {
          aiChatHistory: {
            role: "user",
            content: normalizedMessage,
            timestamp: new Date(),
          },
        },
      }
    );

    const groq = getGroqClient();
    const stream = await groq.chat.completions.create({
      model: getGroqModel(),
      messages,
      stream: true,
      max_completion_tokens: 800,
    });

    let assistantText = "";

    for await (const chunk of stream) {
      const text = chunk.choices?.[0]?.delta?.content || "";
      if (text) {
        assistantText += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    await DailyLog.updateOne(
      { _id: dailyLogId },
      {
        $push: {
          aiChatHistory: {
            role: "assistant",
            content: assistantText,
            timestamp: new Date(),
          },
        },
      }
    );

    res.write("data: [DONE]\n\n");
    return res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message || "Chat failed" })}\n\n`);
    res.write("data: [DONE]\n\n");
    return res.end();
  }
});

router.get("/history/:dailyLogId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { dailyLogId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(dailyLogId)) {
      return res.status(400).json({ success: false, message: "Invalid dailyLogId" });
    }

    const log = await DailyLog.findOne({ _id: dailyLogId, userId }).select("aiChatHistory");
    if (!log) {
      return res.status(404).json({ success: false, message: "Daily log not found" });
    }

    return res.status(200).json({ success: true, data: log.aiChatHistory || [] });
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Failed to fetch chat history" });
  }
});

export default router;
