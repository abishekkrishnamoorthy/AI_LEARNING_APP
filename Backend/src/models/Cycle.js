import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const CycleSchema = new mongoose.Schema(
  {
    topicId: { type: ObjectId, ref: "Topic", required: true, index: true },
    userId: { type: ObjectId, ref: "User", required: true, index: true },

    cycleNumber: { type: Number, required: true },
    startDate: Date,
    endDate: Date,

    days: [
      {
        dayNumber: Number,
        subtopicRef: String,
        isAssessmentDay: { type: Boolean, default: false },
        tasks: [
          {
            type: {
              type: String,
              enum: ["video", "quiz", "depth", "practical", "summary", "depth_question"],
            },
            status: { type: String, enum: ["locked", "active", "done"], default: "locked" },
            resourceId: { type: ObjectId, ref: "Resource" },
            videoId: String,
            depthQuestion: String,
            practicalType: { type: String, enum: ["code", "written"] },
            practicalPrompt: String,
            starterCode: String,
            completedAt: Date,
          },
        ],
      },
    ],

    weakTopicsCarriedIn: [String],
    weakTopics: [String],

    assessment: {
      quizScore: Number,
      depthScore: Number,
      combinedPct: Number,
      rating: { type: String, enum: ["strong", "average", "needs_review"] },
      weakTopics: [String],
      submittedAt: Date,
    },

    status: {
      type: String,
      enum: ["planned", "in_progress", "completed"],
      default: "planned",
    },
  },
  { timestamps: true }
);

CycleSchema.index({ topicId: 1, cycleNumber: 1 }, { unique: true });

const Cycle = mongoose.model("Cycle", CycleSchema);

export default Cycle;
