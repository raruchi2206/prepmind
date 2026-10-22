<<<<<<< HEAD
const aiServiceClient = require("../aiServiceClient");
const { createHttpError } = require("../../middleware/errorMiddleware");
const { formatTimestamp } = require("../../utils/youtube");

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
=======
const { YoutubeTranscript } = require("youtube-transcript");
const { createHttpError } = require("../../middleware/errorMiddleware");

/**
 * Extracts canonical 11-character YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=kqtD5dpn9C8
 * - https://youtu.be/kqtD5dpn9C8
 * - https://www.youtube.com/shorts/kqtD5dpn9C8
 * - https://www.youtube.com/embed/kqtD5dpn9C8
 * - Direct ID: kqtD5dpn9C8
 */
function extractVideoId(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
  );
  return match ? match[1] : null;
}

/**
 * Formats seconds into MM:SS or HH:MM:SS
 */
function formatTime(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const remainingSeconds = sec % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

/**
 * Clean caption text: remove HTML entities, music markers [♪♪♪], [Music], excess whitespace.
 */
function cleanCaptionText(raw) {
  if (!raw) return "";
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\[\s*(?:music|applause|cheering|laughter|sound|♪|♫).*?\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fetch video metadata via public YouTube oEmbed endpoint (no API key needed).
 */
async function fetchVideoMetadata(videoId) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title || "YouTube Video",
        author: data.author_name || "YouTube Creator",
        videoUrl: watchUrl,
      };
    }
  } catch (err) {
    console.warn(`[YOUTUBE METADATA] oEmbed lookup failed for ${videoId}:`, err.message);
  }

  return {
    title: `YouTube Video (${videoId})`,
    author: "YouTube",
    videoUrl: watchUrl,
  };
}

/**
 * Scrape caption tracks directly from YouTube watch page HTML as a fallback.
 */
async function fetchCaptionsFromWatchPage(videoId) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(watchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Failed to load YouTube watch page (status: ${res.status})`);
  }

  const html = await res.text();
  const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
  if (!playerResponseMatch) {
    throw new Error("Could not parse YouTube player response from page.");
  }

  let playerResponse;
  try {
    playerResponse = JSON.parse(playerResponseMatch[1]);
  } catch {
    throw new Error("Failed to parse YouTube player JSON data.");
  }

  const captions =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captions || captions.length === 0) {
    throw new Error("No caption tracks available on this video.");
  }

  // Prefer English or first track
  const track = captions.find((t) => t.languageCode === "en") || captions[0];
  const transcriptRes = await fetch(track.baseUrl, { signal: AbortSignal.timeout(10000) });
  if (!transcriptRes.ok) {
    throw new Error(`Failed to fetch caption XML (status: ${transcriptRes.status})`);
  }

  const xml = await transcriptRes.text();
  const textTagRegex = /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  const items = [];
  let match;

  while ((match = textTagRegex.exec(xml)) !== null) {
    const startSec = parseFloat(match[1]);
    const durSec = parseFloat(match[2]);
    const text = cleanCaptionText(match[3]);
    if (text) {
      items.push({
        text,
        offset: Math.round(startSec * 1000),
        duration: Math.round(durSec * 1000),
      });
    }
  }
>>>>>>> ab8a428 (Uploading of folder,ppt and youtube video link are enabled and quiz generation happening)

  return items;
}

<<<<<<< HEAD
async function extractYouTube(source, { languages } = {}) {
  const videoId = source.youtubeVideoId;
  if (!videoId) {
    throw createHttpError(400, "YouTube source is missing its video ID.", "INVALID_YOUTUBE_URL");
  }

  const preferred = languages || (source.youtube?.requestedLanguage ? [source.youtube.requestedLanguage] : []);
  const transcript = await aiServiceClient.fetchYouTubeTranscript(videoId, preferred);

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
    },
    youtube: {
      title: transcript.title || null,
      channel: transcript.channel || null,
      language: transcript.language || null,
      languageCode: transcript.languageCode || null,
      isGenerated: Boolean(transcript.isGenerated),
      durationSeconds: Number(transcript.durationSeconds) || 0,
      segmentCount: segments.length,
=======
/**
 * Main YouTube extraction function:
 * Accepts YouTube URL or ID, fetches metadata, extracts captions,
 * aggregates segments into structured chunks with timestamps.
 */
async function extractYouTube(urlOrId) {
  const videoId = extractVideoId(urlOrId);
  if (!videoId) {
    throw createHttpError(
      400,
      "Invalid YouTube URL. Please provide a valid YouTube watch URL, shorts URL, or youtu.be link.",
    );
  }

  console.log(`[YOUTUBE INGESTION] Starting extraction for video ID: ${videoId}`);

  // 1. Fetch metadata
  const meta = await fetchVideoMetadata(videoId);

  // 2. Extract raw captions
  let rawItems = [];
  let extractionError = null;

  try {
    rawItems = await YoutubeTranscript.fetchTranscript(videoId);
    console.log(`[YOUTUBE INGESTION] Fetched ${rawItems.length} transcript segments via youtube-transcript`);
  } catch (err) {
    console.warn(`[YOUTUBE INGESTION] youtube-transcript failed for ${videoId}: ${err.message}. Trying watch page scraper...`);
    extractionError = err;
    try {
      rawItems = await fetchCaptionsFromWatchPage(videoId);
      console.log(`[YOUTUBE INGESTION] Fetched ${rawItems.length} transcript segments via watch page scraper`);
    } catch (scrapeErr) {
      console.error(`[YOUTUBE INGESTION] Scraper also failed: ${scrapeErr.message}`);
      throw createHttpError(
        400,
        `Could not retrieve transcript for this YouTube video. ${err.message || scrapeErr.message}. Please verify the video is public and has English captions or subtitles enabled.`,
      );
    }
  }

  if (!rawItems || rawItems.length === 0) {
    throw createHttpError(
      400,
      "This YouTube video has no extractable subtitles or transcript available.",
    );
  }

  // 3. Aggregate short fragments into meaningful readable paragraph blocks (~200-250 words)
  const aggregatedItems = [];
  let currentWords = [];
  let blockStartSeconds = 0;
  let blockEndSeconds = 0;
  let totalWordsCount = 0;

  for (let i = 0; i < rawItems.length; i++) {
    const raw = rawItems[i];
    const cleaned = cleanCaptionText(raw.text);
    if (!cleaned) continue;

    const offsetSec = Math.floor((raw.offset || 0) / 1000);
    const durSec = Math.ceil((raw.duration || 0) / 1000);

    if (currentWords.length === 0) {
      blockStartSeconds = offsetSec;
    }
    blockEndSeconds = offsetSec + durSec;

    currentWords.push(cleaned);
    const segmentWords = cleaned.split(/\s+/).filter(Boolean).length;
    totalWordsCount += segmentWords;

    const currentBlockLength = currentWords.join(" ").split(/\s+/).filter(Boolean).length;
    const isLast = i === rawItems.length - 1;

    // Break when block reaches ~200 words or at end of transcript
    if (currentBlockLength >= 200 || isLast) {
      const blockText = currentWords.join(" ");
      const startTimeStr = formatTime(blockStartSeconds);
      const endTimeStr = formatTime(blockEndSeconds);
      const timeRange = `[${startTimeStr} - ${endTimeStr}]`;
      const videoTimestampUrl = `https://www.youtube.com/watch?v=${videoId}&t=${blockStartSeconds}s`;

      aggregatedItems.push({
        text: `${timeRange} ${blockText}`,
        page: aggregatedItems.length + 1, // logical section index
        section: `YouTube Timestamp ${timeRange}`,
        timestamp: timeRange,
        startSeconds: blockStartSeconds,
        endSeconds: blockEndSeconds,
        videoUrl: videoTimestampUrl,
      });

      currentWords = [];
    }
  }

  if (aggregatedItems.length === 0 || totalWordsCount < 15) {
    throw createHttpError(
      400,
      "YouTube transcript contains insufficient readable text for knowledge processing.",
    );
  }

  console.log(
    `[YOUTUBE INGESTION] Aggregated ${rawItems.length} raw fragments into ${aggregatedItems.length} structured blocks (${totalWordsCount} words total)`,
  );

  return {
    items: aggregatedItems,
    metadata: {
      title: meta.title,
      author: meta.author,
      videoId,
      videoUrl: meta.videoUrl,
      pageCount: aggregatedItems.length,
      wordCount: totalWordsCount,
      durationSeconds: blockEndSeconds,
      formattedDuration: formatTime(blockEndSeconds),
>>>>>>> ab8a428 (Uploading of folder,ppt and youtube video link are enabled and quiz generation happening)
    },
  };
}

<<<<<<< HEAD
module.exports = { extractYouTube, groupSegmentsIntoWindows };
=======
module.exports = {
  extractVideoId,
  extractYouTube,
  formatTime,
  cleanCaptionText,
  fetchVideoMetadata,
};
>>>>>>> ab8a428 (Uploading of folder,ppt and youtube video link are enabled and quiz generation happening)
