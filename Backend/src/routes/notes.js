import express from "express";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import authMiddleware from "../middlewares/authMiddleware.js";
import Note from "../models/Note.js";

const router = express.Router();

const sanitizeFilename = (value = "notes") =>
  String(value)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "notes";

const normalizeTakeaways = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
};

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

router.post("/save", authMiddleware, async (req, res) => {
  try {
    const {
      topicId,
      topicName,
      cycleId,
      cycleNumber,
      dayNumber,
      subtopic,
      content = "",
      aiSummary = "",
      takeaways = [],
    } = req.body || {};

    const missingFields = [];
    if (isBlank(topicId)) missingFields.push("topicId");
    if (isBlank(topicName)) missingFields.push("topicName");
    if (isBlank(cycleId)) missingFields.push("cycleId");
    if (isBlank(cycleNumber)) missingFields.push("cycleNumber");
    if (isBlank(dayNumber)) missingFields.push("dayNumber");
    if (isBlank(subtopic)) missingFields.push("subtopic");

    if (missingFields.length) {
      return res.status(400).json({ error: `Missing required fields: ${missingFields.join(", ")}` });
    }

    if (!mongoose.Types.ObjectId.isValid(topicId) || !mongoose.Types.ObjectId.isValid(cycleId)) {
      return res.status(400).json({ error: "Invalid topicId or cycleId" });
    }

    const parsedCycleNumber = Number(cycleNumber);
    const parsedDayNumber = Number(dayNumber);
    if (!Number.isFinite(parsedCycleNumber) || !Number.isFinite(parsedDayNumber)) {
      return res.status(400).json({ error: "cycleNumber and dayNumber must be valid numbers" });
    }

    const note = await Note.findOneAndUpdate(
      {
        userId: req.user._id,
        topicId,
        cycleId,
        dayNumber: parsedDayNumber,
      },
      {
        $set: {
          content: String(content || ""),
          aiSummary: String(aiSummary || ""),
          takeaways: normalizeTakeaways(takeaways),
          topicName: String(topicName).trim(),
          subtopic: String(subtopic).trim(),
          cycleNumber: parsedCycleNumber,
          savedAt: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    return res.json({ success: true, noteId: note._id, savedAt: note.savedAt });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to save note" });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.topicId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.topicId)) {
        return res.status(400).json({ error: "Invalid topicId" });
      }
      filter.topicId = req.query.topicId;
    }

    const notes = await Note.find(filter)
      .sort({ topicId: 1, cycleNumber: 1, dayNumber: 1 })
      .select("topicId topicName cycleNumber dayNumber subtopic content aiSummary takeaways savedAt");

    return res.json(notes);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to fetch notes" });
  }
});

router.get("/download/txt/:noteId", authMiddleware, async (req, res) => {
  try {
    const { noteId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(404).json({ error: "Not found" });
    }

    const note = await Note.findOne({ _id: noteId, userId: req.user._id });
    if (!note) {
      return res.status(404).json({ error: "Not found" });
    }

    const text = [
      `Topic: ${note.topicName}`,
      `Day ${note.dayNumber} · Cycle ${note.cycleNumber}`,
      `Subtopic: ${note.subtopic}`,
      `Saved: ${new Date(note.savedAt).toDateString()}`,
      "",
      "--- MY NOTES ---",
      note.content || "",
      "",
      "--- AI SUMMARY ---",
      note.aiSummary || "",
      "",
      "--- KEY TAKEAWAYS ---",
      (note.takeaways || []).map((item, index) => `${index + 1}. ${item}`).join("\n"),
    ].join("\n");

    res.setHeader("Content-Type", "text/plain");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${sanitizeFilename(note.topicName)}-day${note.dayNumber}-notes.txt"`
    );
    return res.send(text);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to download note" });
  }
});

router.get("/download/pdf/:topicId", authMiddleware, async (req, res) => {
  try {
    const { topicId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ error: "Invalid topicId" });
    }

    const notes = await Note.find({ userId: req.user._id, topicId }).sort({ cycleNumber: 1, dayNumber: 1 });
    if (!notes.length) {
      return res.status(404).json({ error: "Not found" });
    }

    const topicName = notes[0]?.topicName || "notes";
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${sanitizeFilename(topicName)}-all-notes.pdf"`);

    doc.pipe(res);
    doc.fontSize(20).fillColor("#1A1A1A").text(topicName, { align: "center" });
    doc.moveDown();

    notes.forEach((note, index) => {
      doc.fontSize(14).fillColor("#7B5EA7").text(`Day ${note.dayNumber} — ${note.subtopic}`);
      doc
        .fontSize(10)
        .fillColor("#888")
        .text(`Cycle ${note.cycleNumber} · ${new Date(note.savedAt).toDateString()}`);
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor("#1A1A1A").text(note.content || "");
      doc.moveDown();

      if (note.aiSummary) {
        doc.fontSize(10).fillColor("#444").text(`AI Summary: ${note.aiSummary}`);
        doc.moveDown();
      }

      if (note.takeaways?.length) {
        doc.fontSize(10).fillColor("#7B5EA7").text("Key Takeaways:");
        note.takeaways.forEach((item) => {
          doc.fontSize(10).fillColor("#444").text(`• ${item}`);
        });
      }

      if (index < notes.length - 1) {
        doc.addPage();
      }
    });

    doc.end();
    return undefined;
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to download PDF" });
  }
});

router.get("/:noteId", authMiddleware, async (req, res) => {
  try {
    const { noteId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(404).json({ error: "Not found" });
    }

    const note = await Note.findOne({ _id: noteId, userId: req.user._id });
    if (!note) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.json(note);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to fetch note" });
  }
});

export default router;
