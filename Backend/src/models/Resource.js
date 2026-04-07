import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const ResourceSchema = new mongoose.Schema(
  {
    topicId: { type: ObjectId, ref: "Topic", required: true, index: true },
    cycleId: { type: ObjectId, ref: "Cycle", index: true },
    dayNumber: Number,
    subtopicTitle: { type: String, required: true, index: true },
    level: String,
    type: { type: String, enum: ["video", "article", "quiz_questions", "quiz"] },
    title: String,
    url: String,
    videoId: String,
    channelName: String,
    thumbnailUrl: String,
    searchQuery: String,
    practicalTask: {
      prompt: String,
      type: { type: String, enum: ["code", "written"] },
      starterCode: String,
    },
    depthQuestion: String,
    source: String,
    durationSec: Number,
    cachedAt: Date,
    ttlExpires: Date,
    questions: [
      {
        question: { type: String, required: true },
        options: [{ type: String, required: true }],
        correct: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

ResourceSchema.index({ subtopicTitle: 1, level: 1, type: 1 });
ResourceSchema.index({ topicId: 1, type: 1 });

const Resource = mongoose.model("Resource", ResourceSchema);

export default Resource;
