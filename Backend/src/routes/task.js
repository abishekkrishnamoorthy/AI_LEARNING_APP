import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import Cycle from "../models/Cycle.js";
import DailyLog from "../models/DailyLog.js";
import Resource from "../models/Resource.js";
import { getGroqClient } from "../services/groqService.js";
import {
  completeTaskAndUnlock,
  findCycleAndDay,
  getExpectedTaskTypes,
  getOrCreateDailyLog,
  syncDayTasksWithPolicy,
} from "../services/dailyExecutionService.js";
import { generateSummary } from "../services/summaryGenerator.js";

const router = express.Router();

const enqueueSummaryIfReady = async (dailyLogId) => {
  generateSummary(String(dailyLogId)).catch((error) => {
    console.error("Summary generation failed:", error);
  });
};

const parseModelJson = (raw = "{}") => {
  const cleaned = String(raw)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned || "{}");
};

router.post("/complete", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { cycleId, dayNumber, taskType } = req.body;

    const normalizedTaskType = taskType === "depth" ? "depth_question" : taskType;

    const updateResult = await Cycle.updateOne(
      { _id: cycleId, userId },
      {
        $set: {
          "days.$[day].tasks.$[task].status": "done",
          "days.$[day].tasks.$[task].completedAt": new Date(),
        },
      },
      {
        arrayFilters: [{ "day.dayNumber": Number(dayNumber) }, { "task.type": normalizedTaskType }],
      }
    );

    if (updateResult.modifiedCount === 0 && normalizedTaskType === "depth_question") {
      const fallbackUpdateResult = await Cycle.updateOne(
        { _id: cycleId, userId },
        {
          $set: {
            "days.$[day].tasks.$[task].status": "done",
            "days.$[day].tasks.$[task].completedAt": new Date(),
          },
        },
        {
          arrayFilters: [{ "day.dayNumber": Number(dayNumber) }, { "task.type": "depth" }],
        }
      );
      if (fallbackUpdateResult.modifiedCount === 0) {
        return res.status(400).json({ error: "Task not found or already done" });
      }
    } else if (updateResult.modifiedCount === 0) {
      return res.status(400).json({ error: "Task not found or already done" });
    }

    const cycle = await Cycle.findOne({ _id: cycleId, userId });
    if (!cycle) {
      return res.status(404).json({ error: "Cycle not found" });
    }

    const day = cycle.days.find((item) => Number(item.dayNumber) === Number(dayNumber));
    if (!day) {
      return res.status(404).json({ error: "Day not found" });
    }

    const taskOrder = ["video", "quiz", "depth_question", "depth", "practical", "summary", "assessment"];
    const currentIdx = taskOrder.indexOf(normalizedTaskType);
    let nextTask = null;

    for (let index = currentIdx + 1; index < taskOrder.length; index += 1) {
      const nextType = taskOrder[index];
      const nextTaskDoc = day.tasks.find((task) => task.type === nextType && task.status === "locked");
      if (nextTaskDoc) {
        await Cycle.updateOne(
          { _id: cycleId, userId },
          { $set: { "days.$[day].tasks.$[task].status": "active" } },
          {
            arrayFilters: [{ "day.dayNumber": Number(dayNumber) }, { "task.type": nextType }],
          }
        );
        nextTask = nextType === "depth_question" ? "depth" : nextType;
        break;
      }
    }

    const updatedCycle = await Cycle.findOne({ _id: cycleId, userId });
    const updatedDay = updatedCycle?.days.find((item) => Number(item.dayNumber) === Number(dayNumber));
    if (!updatedDay) {
      return res.status(404).json({ error: "Updated day not found" });
    }

    return res.json({
      success: true,
      nextTask,
      allTasksDone: updatedDay.tasks.every((task) => task.status === "done"),
      tasks: updatedDay.tasks,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Failed to complete task" });
  }
});

router.post("/quiz/submit", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { cycleId, dayNumber, answers } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: "answers is required" });
    }

    const { cycle, day, topic } = await findCycleAndDay({ cycleId, dayNumber, userId });
    syncDayTasksWithPolicy({
      day,
      expectedTypes: getExpectedTaskTypes({ dayNumber: Number(dayNumber), level: topic.level }),
    });

    const resource = await Resource.findOne({ cycleId: cycle._id, dayNumber: Number(dayNumber) });
    if (!resource?.questions?.length) {
      return res.status(404).json({ success: false, message: "Quiz questions not found" });
    }

    const answerMap = new Map(answers.map((item) => [String(item.questionId), item.selected]));

    let score = 0;
    const evaluated = resource.questions.map((question, index) => {
      const questionId = String(question._id || index);
      const selected = answerMap.get(questionId);
      const correct = selected === question.correct;
      if (correct) score += 1;
      return {
        questionId,
        selected: selected || null,
        correct,
        explanation: correct
          ? "Correct. Great choice."
          : `Incorrect. Correct answer is \"${question.correct}\".`,
      };
    });

    const dailyLog = await getOrCreateDailyLog({ cycle, dayNumber, userId });
    dailyLog.quiz = {
      score,
      total: resource.questions.length,
      answers: evaluated.map(({ questionId, selected, correct }) => ({ questionId, selected, correct })),
      perQuestion: evaluated.map(({ correct, explanation }) => ({ correct, explanation })),
      completedAt: new Date(),
    };
    await dailyLog.save();

    const { nextTask, allComplete } = completeTaskAndUnlock({ day, taskType: "quiz" });
    await cycle.save();

    if (allComplete) {
      await enqueueSummaryIfReady(dailyLog._id);
    }

    return res.status(200).json({
      success: true,
      data: {
        score,
        total: resource.questions.length,
        perQuestion: evaluated.map(({ correct, explanation }) => ({ correct, explanation })),
        nextTask,
      },
    });
  } catch (error) {
    const status = error.message?.includes("not found") ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message || "Failed to submit quiz" });
  }
});

router.post("/depth/submit", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { dailyLogId, cycleId, dayNumber, answer } = req.body;

    if (!String(answer || "").trim()) {
      return res.status(400).json({ success: false, message: "answer is required" });
    }

    const { cycle, day, topic } = await findCycleAndDay({ cycleId, dayNumber, userId });
    const resource = await Resource.findOne({ cycleId: cycle._id, dayNumber: Number(dayNumber) });

    const depthQuestion =
      resource?.depthQuestion || day.tasks.find((task) => ["depth", "depth_question"].includes(task.type))?.depthQuestion;

    const prompt = `Subtopic: ${day.subtopicRef}\nStudent answer: "${String(answer).trim()}"\nRate depth of understanding:\n{ "depth": 1-5, "flag": "correct|partial|incorrect", "feedback": "max 15 words shown to student", "weakPoints": ["concept missed"] }\ndepth 1=wrong, 3=partial, 5=excellent. Return ONLY JSON.`;

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a strict but fair evaluator. Return ONLY valid JSON.",
        },
        { role: "user", content: prompt },
      ],
    });

    const parsed = parseModelJson(completion.choices?.[0]?.message?.content);
    const depth = Math.max(1, Math.min(5, Number(parsed.depth) || 1));
    const flag = ["correct", "partial", "incorrect"].includes(parsed.flag) ? parsed.flag : "partial";
    const feedback = String(parsed.feedback || "Keep refining your understanding.").slice(0, 120);
    const weakPoints = Array.isArray(parsed.weakPoints)
      ? parsed.weakPoints.map((item) => String(item).trim()).filter(Boolean)
      : [];

    const dailyLog = await DailyLog.findOne({ _id: dailyLogId, userId, cycleId: cycle._id });
    if (!dailyLog) {
      return res.status(404).json({ success: false, message: "Daily log not found" });
    }

    dailyLog.depthQuestion = {
      question: depthQuestion || "Explain the concept clearly with an example.",
      userAnswer: String(answer).trim(),
      score: depth,
      depth,
      flag,
      feedback,
      weakPoints,
      evaluatedAt: new Date(),
    };
    await dailyLog.save();

    syncDayTasksWithPolicy({
      day,
      expectedTypes: getExpectedTaskTypes({ dayNumber: Number(dayNumber), level: topic.level }),
    });

    const { nextTask } = completeTaskAndUnlock({ day, taskType: "depth" });
    await cycle.save();

    return res.status(200).json({
      success: true,
      data: { depth, flag, feedback, nextTask },
    });
  } catch (error) {
    const status = error.message?.includes("not found") ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message || "Failed to submit depth answer" });
  }
});

router.post("/practical/submit", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { dailyLogId, cycleId, dayNumber, code, language, writtenAnswer } = req.body;

    const { cycle, day, topic } = await findCycleAndDay({ cycleId, dayNumber, userId });

    const dailyLog = await DailyLog.findOne({ _id: dailyLogId, userId, cycleId: cycle._id });
    if (!dailyLog) {
      return res.status(404).json({ success: false, message: "Daily log not found" });
    }

    dailyLog.practicalAnswer = {
      code: String(code || ""),
      language: String(language || ""),
      writtenAnswer: String(writtenAnswer || ""),
      submittedAt: new Date(),
    };
    await dailyLog.save();

    syncDayTasksWithPolicy({
      day,
      expectedTypes: getExpectedTaskTypes({ dayNumber: Number(dayNumber), level: topic.level }),
    });

    const result = completeTaskAndUnlock({ day, taskType: "practical" });
    await cycle.save();

    if (result.allComplete) {
      await enqueueSummaryIfReady(dailyLog._id);
    }

    return res.status(200).json({
      success: true,
      data: {
        nextTask: result.nextTask,
        allComplete: result.allComplete,
      },
    });
  } catch (error) {
    const status = error.message?.includes("not found") ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message || "Failed to submit practical" });
  }
});

export default router;
