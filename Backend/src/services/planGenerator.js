import internalEvents from "../events/internalEvents.js";
import Cycle from "../models/Cycle.js";
import Resource from "../models/Resource.js";
import Topic from "../models/Topic.js";
import { getGroqClient, getGroqModel } from "./groqService.js";
import { selectBestVideo } from "./youtubeSelector.js";

const complete = async ({ system, user, json = false }) => {
  const groq = getGroqClient();
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: user });

  const res = await groq.chat.completions.create({
    model: getGroqModel(),
    messages,
    temperature: 0.3,
    max_completion_tokens: 2048,
    top_p: 1,
    stream: false,
    ...(json ? { response_format: { type: "json_object" } } : {}),
  });

  return res.choices?.[0]?.message?.content || "";
};

const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const stripCodeFences = (text) =>
  String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

const normalizeSubtopics = (rawSubtopics = []) =>
  rawSubtopics
    .map((item, index) => ({
      order: Number(item?.order) || index + 1,
      title: String(item?.title || "").trim(),
      description: String(item?.description || "").trim(),
      estimatedDays: Number(item?.estimatedDays) || 0,
    }))
    .filter((item) => item.title && item.estimatedDays > 0);

const expandSubtopicSequence = (subtopics, durationDays) => {
  const sequence = [];
  for (const subtopic of subtopics) {
    const count = Math.max(1, Math.min(5, Number(subtopic.estimatedDays)));
    for (let index = 0; index < count; index += 1) {
      sequence.push(subtopic.title);
    }
  }
  return sequence.slice(0, durationDays);
};

const normalizeQuestions = (rawQuestions = []) =>
  Array.isArray(rawQuestions)
    ? rawQuestions
        .map((item) => ({
          question: String(item?.question || "").trim(),
          options: Array.isArray(item?.options) ? item.options.map((option) => String(option).trim()) : [],
          correct: String(item?.correct || "").trim(),
        }))
        .filter((item) => item.question && item.options.length === 4 && item.correct)
    : [];

const fallbackQuestions = ({ subtopic, count }) => {
  const base = [
    {
      question: `What best defines ${subtopic}?`,
      options: [
        `${subtopic} principles and core ideas`,
        "An unrelated software process",
        "A hardware-only concept",
        "A database backup method",
      ],
      correct: `${subtopic} principles and core ideas`,
    },
    {
      question: `Which approach improves understanding of ${subtopic}?`,
      options: ["Practice with real examples", "Memorize without context", "Skip fundamentals", "Avoid feedback"],
      correct: "Practice with real examples",
    },
    {
      question: `What is a common mistake in ${subtopic}?`,
      options: ["Ignoring fundamentals", "Reviewing mistakes", "Testing assumptions", "Iterative learning"],
      correct: "Ignoring fundamentals",
    },
  ];

  const questions = [];
  let idx = 0;
  while (questions.length < count) {
    const template = base[idx % base.length];
    questions.push({
      ...template,
      question: `${template.question} (#${questions.length + 1})`,
    });
    idx += 1;
  }
  return questions;
};

const buildDepthQuestion = (subtopic) =>
  `Explain ${subtopic} in your own words, include one use case and one common pitfall.`;

const buildPracticalTask = ({ subtopic, level, dayNumber }) => {
  const preferCode = level !== "beginner" || dayNumber % 2 === 1;
  if (preferCode) {
    return {
      type: "code",
      prompt: `Implement a small solution demonstrating ${subtopic}. Add one edge-case test.`,
      starterCode: `function solve(input) {\n  // Implement ${subtopic} logic\n  return input;\n}\n\nconsole.log(solve("demo"));`,
    };
  }

  return {
    type: "written",
    prompt: `Write a short practical plan applying ${subtopic} to a real project scenario.`,
    starterCode: "",
  };
};

const getExpectedTaskTypes = ({ dayNumber, level }) => {
  if (dayNumber === 5) return ["quiz", "summary"];
  if (level === "beginner" || dayNumber % 2 === 1) {
    return ["video", "quiz", "depth", "practical", "summary"];
  }
  return ["video", "quiz", "summary"];
};

const toDayTasks = ({ dayNumber, level, resource }) => {
  const types = getExpectedTaskTypes({ dayNumber, level });
  return types.map((type, index) => ({
    type,
    status: index === 0 ? "active" : "locked",
    resourceId: resource?._id,
    videoId: type === "video" ? resource?.videoId || null : null,
    depthQuestion: type === "depth" ? resource?.depthQuestion || null : null,
    practicalType: type === "practical" ? resource?.practicalTask?.type || null : null,
    practicalPrompt: type === "practical" ? resource?.practicalTask?.prompt || null : null,
    starterCode: type === "practical" ? resource?.practicalTask?.starterCode || "" : "",
  }));
};

const generateCurriculumPlan = async (topic) => {
  const prompt = `
Design a learning plan for the following topic.

Topic: ${topic.name}
Description: ${topic.description}
Level: ${topic.level}
Goal: ${topic.goal}
Total duration: ${topic.durationDays} days
Daily time: ${topic.dailyMinutes} minutes
Total 5-day cycles: ${topic.totalCycles}

Return a JSON object with this exact shape:
{
  "subtopics": [
    {
      "order": 1,
      "title": "string",
      "description": "string (1-2 sentences)",
      "estimatedDays": number
    }
  ]
}

Rules:
- Cover the full topic syllabus proportional to durationDays
- estimatedDays for all subtopics must sum to exactly ${topic.durationDays}
- Each subtopic should take 1-5 days
- Match depth to level: ${topic.level}
- Prioritize topics most relevant to goal: ${topic.goal}
- Return ONLY the JSON object, no markdown, no explanation
`.trim();

  return complete({
    system: "You are a curriculum design expert. Return ONLY valid JSON.",
    user: prompt,
    json: true,
  });
};

const generateQuizForSubtopic = async ({ title, level }) => {
  const prompt = `Generate 10 MCQ questions for subtopic: ${title} at ${level} level.
Return JSON object:
{
  "questions": [
    {
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correct": "string"
    }
  ]
}
Return ONLY valid JSON.`;

  const raw = await complete({
    system: "Generate high-quality MCQs. Return ONLY valid JSON.",
    user: prompt,
    json: true,
  });

  const parsed = safeJsonParse(stripCodeFences(raw), {});
  return JSON.stringify(Array.isArray(parsed?.questions) ? parsed.questions : []);
};

export const generatePlan = async (topicId) => {
  let topic = await Topic.findById(topicId);
  if (!topic) {
    throw new Error("Topic not found");
  }

  try {
    const rawPlan = await generateCurriculumPlan(topic);
    const parsedPlan = safeJsonParse(stripCodeFences(rawPlan), null);
    if (!parsedPlan || !Array.isArray(parsedPlan.subtopics)) {
      throw new Error("AI returned invalid plan JSON");
    }

    const subtopics = normalizeSubtopics(parsedPlan.subtopics);
    if (subtopics.length === 0) {
      throw new Error("No valid subtopics generated");
    }

    const estimatedDaysSum = subtopics.reduce((acc, item) => acc + item.estimatedDays, 0);
    if (estimatedDaysSum !== topic.durationDays) {
      throw new Error(`Invalid estimatedDays sum: expected ${topic.durationDays}, received ${estimatedDaysSum}`);
    }

    topic.subtopics = subtopics;
    await topic.save();

    const sequence = expandSubtopicSequence(subtopics, topic.durationDays);
    const cycleDays = [1, 2, 3, 4, 5].map((dayNumber) => ({
      dayNumber,
      subtopicRef: dayNumber === 5 ? "Assessment" : sequence[dayNumber - 1] || subtopics[0].title,
      isAssessmentDay: dayNumber === 5,
      tasks: [],
    }));

    const cycle = await Cycle.create({
      topicId: topic._id,
      userId: topic.userId,
      cycleNumber: 1,
      status: "in_progress",
      days: cycleDays,
      weakTopics: [],
    });

    topic.currentCycleId = cycle._id;
    await topic.save();

    const quizBank = [];

    for (const day of cycle.days.filter((item) => Number(item.dayNumber) !== 5)) {
      const rawQuiz = await generateQuizForSubtopic({
        title: day.subtopicRef,
        level: topic.level,
      });

      let normalizedQuestions = normalizeQuestions(safeJsonParse(stripCodeFences(rawQuiz), []));
      if (normalizedQuestions.length < 10) {
        const fallback = fallbackQuestions({ subtopic: day.subtopicRef, count: 10 - normalizedQuestions.length });
        normalizedQuestions = [...normalizedQuestions, ...fallback];
      }

      normalizedQuestions = normalizedQuestions.slice(0, 10);
      quizBank.push(...normalizedQuestions.map((question) => ({ ...question })));

      const practicalTask = buildPracticalTask({
        subtopic: day.subtopicRef,
        level: topic.level,
        dayNumber: Number(day.dayNumber),
      });

      const subtopic = subtopics.find((item) => item.title === day.subtopicRef);
      const selectedVideo = await selectBestVideo({
        subtopic: subtopic?.title || day.subtopicRef,
        level: topic.level,
        goal: topic.goal,
        dailyMinutes: topic.dailyMinutes,
      });

      if (selectedVideo) {
        await Resource.findOneAndUpdate(
          { topicId: topic._id, subtopicTitle: day.subtopicRef, type: "video", level: topic.level },
          {
            $set: {
              topicId: topic._id,
              videoId: selectedVideo.videoId,
              title: selectedVideo.title,
              channelName: selectedVideo.channelName,
              durationSec: selectedVideo.durationSec,
              thumbnailUrl: selectedVideo.thumbnailUrl,
              searchQuery: selectedVideo.searchQuery,
              cachedAt: new Date(),
              ttlExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          },
          { upsert: true, new: true }
        );
      }

      const resource = await Resource.create({
        topicId: topic._id,
        cycleId: cycle._id,
        dayNumber: day.dayNumber,
        subtopicTitle: day.subtopicRef,
        level: topic.level,
        type: "quiz",
        title: `${day.subtopicRef} Learning Pack`,
        source: "ai",
        videoId: selectedVideo?.videoId || null,
        channelName: selectedVideo?.channelName || null,
        thumbnailUrl: selectedVideo?.thumbnailUrl || null,
        durationSec: selectedVideo?.durationSec || null,
        searchQuery: selectedVideo?.searchQuery || null,
        depthQuestion: buildDepthQuestion(day.subtopicRef),
        practicalTask,
        cachedAt: new Date(),
        ttlExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        questions: normalizedQuestions,
      });

      day.tasks = toDayTasks({ dayNumber: Number(day.dayNumber), level: topic.level, resource });
      const videoTask = day.tasks.find((task) => task.type === "video");
      if (videoTask) {
        videoTask.videoId = selectedVideo?.videoId || resource.videoId || null;
      }
    }

    const assessmentDay = cycle.days.find((item) => Number(item.dayNumber) === 5);
    if (assessmentDay) {
      let assessmentQuestions = quizBank.slice(0, 30);
      if (assessmentQuestions.length < 30) {
        assessmentQuestions = [
          ...assessmentQuestions,
          ...fallbackQuestions({ subtopic: topic.name, count: 30 - assessmentQuestions.length }),
        ];
      }

      const assessmentResource = await Resource.create({
        topicId: topic._id,
        cycleId: cycle._id,
        dayNumber: 5,
        subtopicTitle: "Assessment",
        level: topic.level,
        type: "quiz",
        title: `${topic.name} Comprehensive Assessment`,
        source: "ai",
        questions: assessmentQuestions.slice(0, 30),
        cachedAt: new Date(),
        ttlExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      assessmentDay.tasks = toDayTasks({ dayNumber: 5, level: topic.level, resource: assessmentResource });
    }

    await cycle.save();

    topic.status = "active";
    topic.planError = "";
    await topic.save();

    internalEvents.emit("plan:ready", { topicId: topic._id.toString() });

    return { topicId: topic._id.toString(), cycleId: cycle._id.toString() };
  } catch (error) {
    topic = await Topic.findById(topicId);
    if (topic) {
      topic.status = "failed";
      topic.planError = error?.message || "Plan generation failed";
      await topic.save();
    }
    throw error;
  }
};
