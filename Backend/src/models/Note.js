import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const NoteSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, ref: "User", required: true, index: true },
    topicId: { type: ObjectId, ref: "Topic", required: true, index: true },
    topicName: { type: String, required: true },
    cycleId: { type: ObjectId, ref: "Cycle", required: true },
    cycleNumber: { type: Number, required: true },
    dayNumber: { type: Number, required: true },
    subtopic: { type: String, required: true },
    content: { type: String, default: "" },
    aiSummary: { type: String, default: "" },
    takeaways: [String],
    savedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

NoteSchema.index({ userId: 1, topicId: 1, dayNumber: 1 });
NoteSchema.index({ userId: 1, topicId: 1 });
NoteSchema.index({ userId: 1, topicId: 1, cycleId: 1, dayNumber: 1 }, { unique: true });

const Note = mongoose.model("Note", NoteSchema);

export default Note;
