import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const TopicSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, ref: "User", required: true, index: true },

    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    goal: {
      type: String,
      enum: ["interview", "competitive", "academic", "project"],
      required: true,
    },
    durationDays: { type: Number, required: true, min: 5, max: 180 },
    dailyMinutes: { type: Number, required: true },

    subtopics: [
      {
        order: Number,
        title: String,
        description: String,
        estimatedDays: Number,
      },
    ],
    totalCycles: Number,
    bannerIndex: {
      type: Number,
      min: 0,
      max: 4,
      default: () => Math.floor(Math.random() * 5),
    },
    planError: { type: String, default: "" },
    completedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },

    status: {
      type: String,
      enum: ["pending", "generating", "active", "paused", "completed", "failed", "deleted"],
      default: "pending",
    },
    currentCycleId: { type: ObjectId, ref: "Cycle" },
    completionPercent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TopicSchema.index({ userId: 1, status: 1 });

const Topic = mongoose.model("Topic", TopicSchema);

export default Topic;
