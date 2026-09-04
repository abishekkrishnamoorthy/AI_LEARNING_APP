import Cycle from "../models/Cycle.js";
import DailyLog from "../models/DailyLog.js";
import { getGroqClient, getGroqModel } from "./groqService.js";

const parseModelJson = (raw = "{}") => {
  const cleaned = String(raw).replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned || "{}");
};

export const generateSummary = async (dailyLogId) => {
  if (!dailyLogId) {
    throw new Error("dailyLogId is required");
  }

  const dailyLog = await DailyLog.findById(dailyLogId);
  if (!dailyLog) {
    throw new Error("Daily log not found");
  }

  const cycle = await Cycle.findById(dailyLog.cycleId);
  if (!cycle) {
    throw new Error("Cycle not found");
  }

  const day = cycle.days.find((item) => Number(item.dayNumber) === Number(dailyLog.dayNumber));
  const subtopic = day?.subtopicRef || "Assessment";

  const quizScore = Number(dailyLog.quiz?.score || 0);
  const depth = Number(dailyLog.depthQuestion?.depth || dailyLog.depthQuestion?.score || 0);
  const flag = dailyLog.depthQuestion?.flag || "partial";
  const weakPoints = Array.isArray(dailyLog.depthQuestion?.weakPoints) ? dailyLog.depthQuestion.weakPoints : [];

  const quizPct = (Math.min(quizScore, 10) / 10) * 60;
  const depthPct = (Math.min(depth, 5) / 5) * 40;
  const combinedScore = Math.round(quizPct + depthPct);
  const rating = combinedScore >= 80 ? "strong" : combinedScore >= 60 ? "average" : "needs_review";

  const weakFlagged = combinedScore < 60 || depth < 3;

  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: getGroqModel(),
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a learning coach. Return ONLY valid JSON.",
      },
      {
        role: "user",
        content: `Generate daily summary for student.\nSubtopic: ${subtopic}\nQuiz score: ${quizScore}/10\nDepth score: ${depth}/5, flag: ${flag}\nWeak points: ${JSON.stringify(
          weakPoints
        )}\nCombined score: ${combinedScore}%\n\nReturn:\n{\n  "takeaways": ["You understood...", "You partially...", "Review..."],\n  "keyToRemember": ["concept 1", "concept 2"],\n  "combinedScore": ${combinedScore},\n  "performanceRating": "${rating}",\n  "weakFlagged": ${weakFlagged}\n}\nRules: takeaways exactly 3 strings, max 12 words each.\nkeyToRemember: 2-3 strings. Return ONLY JSON.`,
      },
    ],
  });

  const parsed = parseModelJson(completion.choices?.[0]?.message?.content);

  const takeaways = Array.isArray(parsed.takeaways)
    ? parsed.takeaways.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
    : [];
  while (takeaways.length < 3) {
    takeaways.push("Review core concepts and practice consistently.");
  }

  const keyToRemember = Array.isArray(parsed.keyToRemember)
    ? parsed.keyToRemember.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
    : [];

  dailyLog.summary = {
    takeaways,
    keyToRemember: keyToRemember.length > 0 ? keyToRemember : ["Revise weak concepts", "Practice with examples"],
    combinedScore,
    performanceRating: ["strong", "average", "needs_review"].includes(parsed.performanceRating)
      ? parsed.performanceRating
      : rating,
    weakFlagged: typeof parsed.weakFlagged === "boolean" ? parsed.weakFlagged : weakFlagged,
    generatedAt: new Date(),
  };

  await dailyLog.save();

  if (dailyLog.summary.weakFlagged && subtopic && subtopic !== "Assessment") {
    cycle.weakTopics = Array.isArray(cycle.weakTopics) ? cycle.weakTopics : [];
    if (!cycle.weakTopics.includes(subtopic)) {
      cycle.weakTopics.push(subtopic);
      await cycle.save();
    }
  }

  return { dailyLogId: String(dailyLog._id), combinedScore };
};
