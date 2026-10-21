const { createHttpError } = require("../middleware/errorMiddleware");

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);
const SHORT_HOSTS = new Set(["youtu.be", "www.youtu.be"]);
const PATH_PREFIXES = ["shorts", "embed", "live", "v"];
const MAX_URL_LENGTH = 2048;

/**
 * Extracts the 11-character video ID from a YouTube URL.
 * Supports watch?v=, youtu.be/, /shorts/, /embed/, /live/ and /v/ forms.
 * Returns null for anything that is not a recognised YouTube video URL.
 */
function extractYouTubeVideoId(rawUrl) {
  if (typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null;

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);
  let candidate = null;

  if (SHORT_HOSTS.has(host)) {
    candidate = segments[0];
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (segments[0] === "watch") {
      candidate = url.searchParams.get("v");
    } else if (PATH_PREFIXES.includes(segments[0])) {
      candidate = segments[1];
    }
  }

  return candidate && VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
}

function parseYouTubeUrl(rawUrl) {
  const videoId = extractYouTubeVideoId(rawUrl);
  if (!videoId) {
    throw createHttpError(
      400,
      "Invalid YouTube URL. Use a link like https://www.youtube.com/watch?v=VIDEO_ID, https://youtu.be/VIDEO_ID or https://www.youtube.com/shorts/VIDEO_ID.",
      "INVALID_YOUTUBE_URL",
    );
  }
  return {
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

function formatTimestamp(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`;
}

module.exports = {
  extractYouTubeVideoId,
  parseYouTubeUrl,
  formatTimestamp,
};
