import { google } from "googleapis";
import { getGroqClient, getGroqModel } from "./groqService.js";

let youtubeClient = null;

const getYoutubeClient = () => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is missing or empty");
  }

  if (!youtubeClient) {
    youtubeClient = google.youtube({
      version: "v3",
      auth: apiKey,
    });
  }

  return youtubeClient;
};

const TRUSTED_CHANNELS = [
  "NeetCode",
  "Fireship",
  "Traversy Media",
  "The Coding Train",
  "CS50",
  "freeCodeCamp.org",
  "Programming with Mosh",
  "TechWithTim",
  "Abdul Bari",
  "mycodeschool",
  "WilliamFiset",
  "Back To Back SWE",
  "MIT OpenCourseWare",
  "3Blue1Brown",
  "Kurzgesagt",
  "CrashCourse",
];

export const buildSearchQuery = (subtopic, level, goal) => {
  const goalKeyword =
    {
      interview: "interview preparation",
      competitive: "exam preparation",
      academic: "explained simply",
      project: "tutorial practical",
    }[goal] || "tutorial";

  const levelKeyword =
    {
      beginner: "beginner explained",
      intermediate: "intermediate tutorial",
      advanced: "advanced deep dive",
    }[level] || "tutorial";

  return `${subtopic} ${levelKeyword} ${goalKeyword}`;
};

const parseISO8601Duration = (iso) => {
  const match = String(iso || "").match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = Number.parseInt(match[1] || "0", 10);
  const m = Number.parseInt(match[2] || "0", 10);
  const s = Number.parseInt(match[3] || "0", 10);
  return h * 3600 + m * 60 + s;
};

const searchVideos = async (query) => {
  const youtube = getYoutubeClient();
  const res = await youtube.search.list({
    part: ["snippet"],
    q: query,
    type: ["video"],
    maxResults: 8,
    relevanceLanguage: "en",
    videoEmbeddable: "true",
    videoDuration: "medium",
    safeSearch: "strict",
  });

  return (res.data.items || []).map((item) => ({
    videoId: item.id?.videoId,
    title: item.snippet?.title || "",
    channelName: item.snippet?.channelTitle || "",
    thumbnail: item.snippet?.thumbnails?.medium?.url || "",
  }));
};

const getVideoDetails = async (videoIds) => {
  if (!videoIds.length) return [];
  const youtube = getYoutubeClient();

  const res = await youtube.videos.list({
    part: ["contentDetails", "statistics"],
    id: videoIds,
  });

  return (res.data.items || []).map((item) => {
    const iso = item.contentDetails?.duration;
    const durationSec = parseISO8601Duration(iso);
    return {
      videoId: item.id,
      durationSec,
      viewCount: Number.parseInt(item.statistics?.viewCount || "0", 10),
      likeCount: Number.parseInt(item.statistics?.likeCount || "0", 10),
    };
  });
};

const filterByDuration = (videos, dailyMinutes) => {
  const maxSec = Number(dailyMinutes || 0) * 60;
  const relaxedMax = maxSec * 1.5;

  let filtered = videos.filter((video) => video.durationSec <= maxSec);
  if (filtered.length === 0) {
    filtered = videos.filter((video) => video.durationSec <= relaxedMax);
  }
  if (filtered.length === 0 && videos.length > 0) {
    const sorted = [...videos].sort((a, b) => a.durationSec - b.durationSec);
    filtered = [sorted[0]];
  }
  return filtered;
};

const rankVideosWithAI = async (candidates, subtopic, level, goal, dailyMinutes) => {
  if (candidates.length === 1) return candidates[0].videoId;

  const videoList = candidates
    .map(
      (video, index) => `${index + 1}. videoId: "${video.videoId}"
title: "${video.title}"
channel: "${video.channelName}"
duration: ${Math.round(video.durationSec / 60)} min
views: ${video.viewCount.toLocaleString()}`
    )
    .join("\n\n");

  try {
    const groq = getGroqClient();
    const res = await groq.chat.completions.create({
      model: getGroqModel(),
      max_completion_tokens: 200,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a learning content curator. Return ONLY valid JSON.",
        },
        {
          role: "user",
          content: `Select the BEST YouTube video for a student.

Subtopic: ${subtopic}
Level: ${level}
Goal: ${goal}
Target duration: ${dailyMinutes} minutes

Preferred channels (higher priority if title is relevant):
${TRUSTED_CHANNELS.join(", ")}

Candidate videos:
${videoList}

Ranking criteria (in order of importance):
1. Title must be directly about "${subtopic}"
2. Channel credibility (prefer trusted channels above)
3. Duration closest to ${dailyMinutes} minutes
4. Higher view count = more trusted

Return this exact JSON:
{
  "bestVideoId": "the videoId string",
  "reason": "one sentence explanation"
}

Return ONLY the JSON.`,
        },
      ],
    });

    const parsed = JSON.parse(res.choices?.[0]?.message?.content || "{}");
    return parsed.bestVideoId;
  } catch {
    return [...candidates].sort((a, b) => b.viewCount - a.viewCount)[0]?.videoId || null;
  }
};

export const selectBestVideo = async ({ subtopic, level, goal, dailyMinutes }) => {
  try {
    if (!process.env.YOUTUBE_API_KEY) return null;

    const query = buildSearchQuery(subtopic, level, goal);
    const results = await searchVideos(query);
    const validResults = results.filter((item) => item.videoId);
    if (!validResults.length) return null;

    const videoIds = validResults.map((item) => item.videoId);
    const details = await getVideoDetails(videoIds);

    const merged = validResults.map((result) => {
      const detail = details.find((item) => item.videoId === result.videoId) || {};
      return {
        ...result,
        durationSec: detail.durationSec || 999,
        viewCount: detail.viewCount || 0,
      };
    });

    const filtered = filterByDuration(merged, dailyMinutes);
    const bestId = await rankVideosWithAI(filtered, subtopic, level, goal, dailyMinutes);
    const bestVideo = merged.find((item) => item.videoId === bestId) || filtered[0];
    if (!bestVideo) return null;

    return {
      videoId: bestVideo.videoId,
      title: bestVideo.title,
      channelName: bestVideo.channelName,
      durationSec: bestVideo.durationSec,
      thumbnailUrl: bestVideo.thumbnail,
      searchQuery: query,
    };
  } catch (error) {
    console.error("Video selection failed:", error.message);
    return null;
  }
};
