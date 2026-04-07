import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const DailyLogSchema = new mongoose.Schema(
  {
    cycleId: { type: ObjectId, ref: "Cycle", required: true, index: true },
    topicId: { type: ObjectId, ref: "Topic", required: true, index: true },
    userId: { type: ObjectId, ref: "User", required: true },
    dayNumber: { type: Number, required: true },

    videoWatchedAt: Date,
    notes: {
      content: { type: String, default: "" },
      updatedAt: Date,
    },
    videoProgress: {
      percent: { type: Number, default: 0 },
      currentTime: { type: Number, default: 0 },
      duration: { type: Number, default: 0 },
      videoId: { type: String, default: "" },
      ended: { type: Boolean, default: false },
      completed: { type: Boolean, default: false },
      completedAt: Date,
      updatedAt: Date,
      markedWatchedAt: Date,
    },
    quiz: {
      score: Number,
      answers: [{ questionId: String, selected: String, correct: Boolean }],
      total: Number,
      perQuestion: [{ correct: Boolean, explanation: String }],
      completedAt: Date,
    },
    depthQuestion: {
      question: String,
      userAnswer: String,
      score: Number,
      depth: Number,
      flag: { type: String, enum: ["correct", "partial", "incorrect"] },
      feedback: String,
      weakPoints: [String],
      evaluatedAt: Date,
    },
    practicalAnswer: {
      code: String,
      language: String,
      writtenAnswer: String,
      submittedAt: Date,
    },
    aiChatHistory: [
      {
        role: String,
        content: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],

    summary: {
      takeaways: [String],
      keyToRemember: [String],
      combinedScore: Number,
      performanceRating: { type: String, enum: ["strong", "average", "needs_review"] },
      weakFlagged: Boolean,
      generatedAt: Date,
    },

    sessionMinutes: Number,
    inactivityCount: Number,
  },
  { timestamps: true }
);

DailyLogSchema.index({ cycleId: 1, dayNumber: 1 }, { unique: true });
DailyLogSchema.index({ topicId: 1 });

const DailyLog = mongoose.model("DailyLog", DailyLogSchema);

export default DailyLog;
