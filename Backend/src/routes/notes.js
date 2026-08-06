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

const drawSectionTitle = (doc, title) => {
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#7B5EA7").text(title);
  doc.moveDown(0.35);
};

const normalizeInlineMarkdown = (line = "") =>
  String(line)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1");

const ensurePdfSpace = (doc, needed = 48) => {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
};

const renderMarkdownPdf = (doc, markdown = "") => {
  const lines = String(markdown || "").split(/\r?\n/);
  let inCodeBlock = false;

  lines.forEach((rawLine) => {
    const line = String(rawLine || "");
    const trimmed = line.trim();
    ensurePdfSpace(doc, 36);

    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      if (inCodeBlock) {
        doc.moveDown(0.25);
      } else {
        doc.moveDown(0.45);
      }
      return;
    }

    if (inCodeBlock) {
      doc
        .font("Courier")
        .fontSize(9)
        .fillColor("#1A1A1A")
        .text(line || " ", { lineGap: 3 });
      return;
    }

    if (!trimmed) {
      doc.moveDown(0.45);
      return;
    }

    if (/^---+$/.test(trimmed)) {
      const y = doc.y + 4;
      doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).strokeColor("#E0E0E0").stroke();
      doc.moveDown(0.9);
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const size = level === 1 ? 17 : level === 2 ? 14 : 12;
      doc
        .font("Helvetica-Bold")
        .fontSize(size)
        .fillColor(level === 1 ? "#1A1A1A" : "#7B5EA7")
        .text(normalizeInlineMarkdown(heading[2]), { lineGap: 4 });
      doc.moveDown(0.2);
      return;
    }

    const quote = trimmed.match(/^>\s*(.+)$/);
    if (quote) {
      doc
        .font("Helvetica-Oblique")
        .fontSize(10)
        .fillColor("#555")
        .text(`| ${normalizeInlineMarkdown(quote[1])}`, { indent: 10, lineGap: 4 });
      doc.moveDown(0.2);
      return;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#1A1A1A")
        .text(`- ${normalizeInlineMarkdown(bullet[1])}`, { indent: 12, lineGap: 4 });
      return;
    }

    const numbered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numbered) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#1A1A1A")
        .text(`${trimmed.match(/^\d+/)?.[0] || "1"}. ${normalizeInlineMarkdown(numbered[1])}`, {
          indent: 12,
          lineGap: 4,
        });
      return;
    }

    doc.font("Helvetica").fontSize(10).fillColor("#1A1A1A").text(normalizeInlineMarkdown(line), { lineGap: 4 });
  });
};

const renderNotePdfContent = (doc, note) => {
  doc.font("Helvetica-Bold").fontSize(20).fillColor("#1A1A1A").text(note.topicName || "Learning Notes");
  doc.moveDown(0.2);
  doc.font("Helvetica-Bold").fontSize(15).fillColor("#7B5EA7").text(note.subtopic || "Learning session");
  doc.moveDown(0.25);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#666")
    .text(
      `Day ${note.dayNumber || "-"} | Cycle ${note.cycleNumber || "-"} | Saved ${new Date(
        note.savedAt || Date.now()
      ).toDateString()}`
    );

  drawSectionTitle(doc, "My notes");
  renderMarkdownPdf(doc, note.content || "No notes text saved.");

  drawSectionTitle(doc, "AI summary");
  renderMarkdownPdf(doc, note.aiSummary || "No AI summary saved.");

  drawSectionTitle(doc, "Key takeaways");
  if (note.takeaways?.length) {
    renderMarkdownPdf(doc, note.takeaways.map((item) => `- ${item}`).join("\n"));
  } else {
    renderMarkdownPdf(doc, "No takeaways saved.");
  }
};

const streamNotesPdf = ({ res, filename, notes }) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${sanitizeFilename(filename)}.pdf"`);
  doc.pipe(res);

  notes.forEach((note, index) => {
    if (index > 0) doc.addPage();
    renderNotePdfContent(doc, note);
  });

  doc.end();
};

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

router.get("/download/pdf/note/:noteId", authMiddleware, async (req, res) => {
  try {
    const { noteId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(404).json({ error: "Not found" });
    }

    const note = await Note.findOne({ _id: noteId, userId: req.user._id });
    if (!note) {
      return res.status(404).json({ error: "Not found" });
    }

    streamNotesPdf({
      res,
      filename: `${note.topicName}-day${note.dayNumber}-notes`,
      notes: [note],
    });
    return undefined;
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to download PDF" });
  }
});

router.post("/download/pdf/draft", authMiddleware, async (req, res) => {
  try {
    const {
      topicName = "Learning Notes",
      cycleNumber = 1,
      dayNumber,
      subtopic = "Learning session",
      content = "",
      aiSummary = "",
      takeaways = [],
    } = req.body || {};

    const note = {
      topicName: String(topicName || "Learning Notes"),
      cycleNumber: Number(cycleNumber) || 1,
      dayNumber: Number(dayNumber) || "-",
      subtopic: String(subtopic || "Learning session"),
      content: String(content || ""),
      aiSummary: String(aiSummary || ""),
      takeaways: normalizeTakeaways(takeaways),
      savedAt: new Date(),
    };

    streamNotesPdf({
      res,
      filename: `${note.topicName}-day${note.dayNumber}-draft-notes`,
      notes: [note],
    });
    return undefined;
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to download PDF" });
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

    streamNotesPdf({
      res,
      filename: `${notes[0]?.topicName || "notes"}-all-notes`,
      notes,
    });
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
