const test = require("node:test");
const assert = require("node:assert/strict");
const { extractYouTubeVideoId, parseYouTubeUrl, formatTimestamp } = require("../src/utils/youtube");
const { groupSegmentsIntoWindows } = require("../src/services/extractors/youtubeExtractor");
const { createChunksFromExtractedItems } = require("../src/utils/chunker");

test("extracts video IDs from supported YouTube URL forms", () => {
  const id = "aircAruvnKk";
  const urls = [
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=42s&list=PL123`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube.com/live/${id}`,
    `www.youtube.com/watch?v=${id}`,
    `  https://www.youtube.com/watch?v=${id}  `,
  ];
  for (const url of urls) {
    assert.equal(extractYouTubeVideoId(url), id, url);
  }
});

test("rejects invalid or non-YouTube URLs", () => {
  const bad = [
    "",
    "not a url",
    "https://example.com/watch?v=aircAruvnKk",
    "https://youtube.com.evil.com/watch?v=aircAruvnKk",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/watch?v=aircAruvnKk<script>",
    "https://www.youtube.com/channel/UCYO_jab_esuFRV4b17AJtAw",
    "javascript:alert(1)",
    "ftp://youtu.be/aircAruvnKk",
    `https://youtu.be/${"a".repeat(3000)}`,
    null,
  ];
  for (const url of bad) {
    assert.equal(extractYouTubeVideoId(url), null, String(url));
  }
  assert.throws(() => parseYouTubeUrl("https://example.com"), (err) => err.code === "INVALID_YOUTUBE_URL");
});

test("parseYouTubeUrl returns a canonical URL", () => {
  assert.deepEqual(parseYouTubeUrl("https://youtu.be/aircAruvnKk?t=3"), {
    videoId: "aircAruvnKk",
    canonicalUrl: "https://www.youtube.com/watch?v=aircAruvnKk",
  });
});

test("formatTimestamp renders mm:ss and h:mm:ss", () => {
  assert.equal(formatTimestamp(0), "00:00");
  assert.equal(formatTimestamp(252.7), "04:12");
  assert.equal(formatTimestamp(3725), "1:02:05");
});

test("transcript segments become ordered, timestamped chunks", () => {
  const segments = [];
  for (let i = 0; i < 100; i++) {
    segments.push({ text: `sentence number ${i} about neural networks`, start: i * 5, duration: 5 });
  }
  const items = groupSegmentsIntoWindows(segments);
  assert.ok(items.length > 1);
  for (let i = 1; i < items.length; i++) {
    assert.ok(items[i].startTime >= items[i - 1].endTime - 5, "windows are ordered");
  }
  assert.equal(items[0].startTime, 0);
  assert.equal(items[items.length - 1].endTime, 500);

  const allText = items.map((item) => item.text).join(" ");
  assert.equal(allText.split(/\s+/).length, segments.length * 6, "no words lost");

  const chunks = createChunksFromExtractedItems(items, {
    userId: "u1",
    knowledgeSourceId: "s1",
    sourceType: "YOUTUBE",
  });
  assert.equal(chunks.length, items.length);
  chunks.forEach((chunk, idx) => {
    assert.equal(chunk.chunkIndex, idx);
    assert.equal(chunk.metadata.sourceType, "YOUTUBE");
    assert.equal(chunk.metadata.startTime, items[idx].startTime);
    assert.equal(chunk.metadata.endTime, items[idx].endTime);
  });
});
