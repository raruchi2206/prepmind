const aiServiceClient = require("../aiServiceClient");
const { createHttpError } = require("../../middleware/errorMiddleware");
const { formatTimestamp, extractYouTubeVideoId } = require("../../utils/youtube");

// Transcript windows are kept well below CHUNK_SIZE so each window becomes one
// chunk with an accurate start/end time.
const WINDOW_MAX_WORDS = parseInt(process.env.YOUTUBE_WINDOW_WORDS || "250", 10);
const WINDOW_MAX_SECONDS = parseInt(process.env.YOUTUBE_WINDOW_SECONDS || "150", 10);

/**
 * Groups ordered transcript segments into timestamped text windows.
 */
function groupSegmentsIntoWindows(segments) {
  const items = [];
  let buffer = [];
  let words = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    const first = buffer[0];
    const last = buffer[buffer.length - 1];
    const startTime = first.start;
    const endTime = Number((last.start + (last.duration || 0)).toFixed(2));
    items.push({
      text: buffer.map((s) => s.text).join(" "),
      section: `${formatTimestamp(startTime)} - ${formatTimestamp(endTime)}`,
      startTime,
      endTime,
    });
    buffer = [];
    words = 0;
  };

  for (const segment of segments) {
    const segmentWords = segment.text.split(/\s+/).filter(Boolean).length;
    const elapsed = buffer.length > 0 ? segment.start - buffer[0].start : 0;
    if (
      buffer.length > 0 &&
      (words + segmentWords > WINDOW_MAX_WORDS || elapsed >= WINDOW_MAX_SECONDS)
    ) {
      flush();
    }
    buffer.push(segment);
    words += segmentWords;
  }
  flush();

  return items;
}

// Accepts a KnowledgeSource document, or a YouTube URL/ID string
async function extractYouTube(source, { languages, signal } = {}) {
  if (typeof source === "string") {
    source = { youtubeVideoId: extractYouTubeVideoId(source) || (/^[A-Za-z0-9_-]{11}$/.test(source) ? source : null) };
  }
  const videoId = source.youtubeVideoId;
  if (!videoId) {
    throw createHttpError(400, "YouTube source is missing its video ID.", "INVALID_YOUTUBE_URL");
  }

  const preferred = languages || (source.youtube?.requestedLanguage ? [source.youtube.requestedLanguage] : []);
  const transcript = await aiServiceClient.fetchYouTubeTranscript(videoId, preferred, { signal });

  const segments = (transcript.segments || [])
    .filter((s) => s && typeof s.text === "string" && s.text.trim())
    .map((s) => ({
      text: s.text.trim(),
      start: Number(s.start) || 0,
      duration: Number(s.duration) || 0,
    }))
    .sort((a, b) => a.start - b.start);

  if (segments.length === 0) {
    throw createHttpError(422, "The transcript for this video is empty.", "EMPTY_TRANSCRIPT");
  }

  const items = groupSegmentsIntoWindows(segments);
  const wordCount = segments.reduce(
    (acc, s) => acc + s.text.split(/\s+/).filter(Boolean).length,
    0,
  );

  return {
    items,
    metadata: {
      pageCount: 0,
      wordCount,
      title: transcript.title || null,
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    },
    youtube: {
      title: transcript.title || null,
      channel: transcript.channel || null,
      language: transcript.language || null,
      languageCode: transcript.languageCode || null,
      isGenerated: Boolean(transcript.isGenerated),
      durationSeconds: Number(transcript.durationSeconds) || 0,
      segmentCount: segments.length,
    },
  };
}

module.exports = {
  extractYouTube,
  groupSegmentsIntoWindows,
  extractVideoId: extractYouTubeVideoId,
};
