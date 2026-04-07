import mongoose from "mongoose";
import Cycle from "../models/Cycle.js";
import DailyLog from "../models/DailyLog.js";
import Topic from "../models/Topic.js";

const normalizeTaskType = (type = "") => {
  if (type === "depth_question") return "depth";
  return type;
};

export const getDayType = ({ dayNumber, level }) => {
  if (dayNumber === 5) return "assessment";
  if (level === "beginner") return "beginner_all_tasks";
  return dayNumber % 2 === 1 ? "odd" : "even";
};

export const getExpectedTaskTypes = ({ dayNumber, level }) => {
  if (dayNumber === 5) return ["quiz", "summary"];
  if (level === "beginner" || dayNumber % 2 === 1) {
    return ["video", "quiz", "depth", "practical", "summary"];
  }
  return ["video", "quiz", "summary"];
};

const ensureActiveTask = (tasks) => {
  const hasActive = tasks.some((task) => task.status === "active");
  if (!hasActive) {
    const firstLocked = tasks.find((task) => task.status === "locked");
    if (firstLocked) firstLocked.status = "active";
  }
  return tasks;
};

export const syncDayTasksWithPolicy = ({ day, expectedTypes }) => {
  const byType = new Map();
  for (const task of day.tasks || []) {
    const normalized = normalizeTaskType(task.type);
    if (!byType.has(normalized)) {
      byType.set(normalized, task);
    }
  }

  const rebuilt = expectedTypes.map((type) => {
    const existing = byType.get(type);
    if (existing) {
      existing.type = type;
      return existing;
    }
    return {
      type,
      status: "locked",
    };
  });

  const hasDone = rebuilt.some((task) => task.status === "done");
  if (!hasDone && rebuilt.length > 0 && !rebuilt.some((task) => task.status === "active")) {
    rebuilt[0].status = "active";
  }

  day.tasks = ensureActiveTask(rebuilt);
  return day.tasks;
};

export const findCycleAndDay = async ({ cycleId, dayNumber, userId }) => {
  if (!mongoose.Types.ObjectId.isValid(cycleId)) {
    throw new Error("Invalid cycleId");
  }

  const cycle = await Cycle.findOne({ _id: cycleId, userId });
  if (!cycle) {
    throw new Error("Cycle not found");
  }

  const day = cycle.days.find((item) => Number(item.dayNumber) === Number(dayNumber));
  if (!day) {
    throw new Error("Day not found");
  }

  const topic = await Topic.findById(cycle.topicId).select("level name");
  if (!topic) {
    throw new Error("Topic not found");
  }

  return { cycle, day, topic };
};

export const getOrCreateDailyLog = async ({ cycle, dayNumber, userId }) => {
  const log = await DailyLog.findOneAndUpdate(
    { cycleId: cycle._id, dayNumber: Number(dayNumber) },
    {
      $setOnInsert: {
        cycleId: cycle._id,
        topicId: cycle.topicId,
        userId,
        dayNumber: Number(dayNumber),
      },
    },
    { upsert: true, new: true }
  );

  return log;
};

export const completeTaskAndUnlock = ({ day, taskType }) => {
  const normalizedTaskType = normalizeTaskType(taskType);
  const currentIndex = day.tasks.findIndex((task) => normalizeTaskType(task.type) === normalizedTaskType);

  if (currentIndex === -1) {
    throw new Error("Task not found for this day");
  }

  const currentTask = day.tasks[currentIndex];
  currentTask.status = "done";
  currentTask.completedAt = new Date();

  let nextTask = null;
  for (let idx = currentIndex + 1; idx < day.tasks.length; idx += 1) {
    if (day.tasks[idx].status !== "done") {
      day.tasks[idx].status = "active";
      nextTask = day.tasks[idx];
      break;
    }
  }

  const allComplete = day.tasks
    .filter((task) => normalizeTaskType(task.type) !== "summary")
    .every((task) => task.status === "done");

  return {
    nextTask: nextTask ? normalizeTaskType(nextTask.type) : null,
    allComplete,
  };
};

export const normalizeTaskList = (tasks = []) =>
  tasks.map((task) => ({
    ...task.toObject?.(),
    type: normalizeTaskType(task.type),
  }));

export const serializeTask = (task) => {
  if (!task) return null;
  return {
    type: normalizeTaskType(task.type),
    status: task.status,
  };
};
