import { getGroqClient } from "./groqService.js";

const parseModelJson = (raw = "{}") => {
  const cleaned = String(raw)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned || "{}");
};

export const generateCurriculumPlan = async (topic) => {
  const groq = getGroqClient();
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

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    max_completion_tokens: 1800,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You are a curriculum design expert. Return ONLY valid JSON." },
      { role: "user", content: prompt },
    ],
  });

  const parsed = parseModelJson(response?.choices?.[0]?.message?.content);
  return JSON.stringify({ subtopics: Array.isArray(parsed.subtopics) ? parsed.subtopics : [] });
};

export const generateQuizForSubtopic = async ({ title, level }) => {
  const groq = getGroqClient();
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

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    max_completion_tokens: 1800,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Generate high-quality MCQs. Return ONLY valid JSON." },
      { role: "user", content: prompt },
    ],
  });

  const parsed = parseModelJson(response?.choices?.[0]?.message?.content);
  return JSON.stringify(Array.isArray(parsed.questions) ? parsed.questions : []);
};
