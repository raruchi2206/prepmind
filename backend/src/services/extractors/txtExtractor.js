const fs = require("fs").promises;
const { createHttpError } = require("../../middleware/errorMiddleware");

async function extractTxt(filePath) {
  let buf;
  try {
    buf = await fs.readFile(filePath);
  } catch (err) {
    throw createHttpError(400, `Unable to read text file: ${err.message}`);
  }

  let content = "";
  // Check for UTF-16 LE BOM (FF FE) or UTF-16 BE BOM (FE FF)
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    content = buf.subarray(2).toString("utf16le");
  } else if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    content = buf.subarray(2).swap16().toString("utf16le");
  } else if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    // UTF-8 BOM
    content = buf.subarray(3).toString("utf8");
  } else {
    content = buf.toString("utf8");
  }

  // Strip null characters and whitespace
  const rawText = content.replace(/\0/g, "").trim();
  if (!rawText) {
    throw createHttpError(400, "Text file is empty or contains only whitespace.");
  }

  const words = rawText.split(/\s+/).filter(Boolean);

  return {
    items: [{ text: rawText }],
    metadata: {
      pageCount: null,
      wordCount: words.length,
      charCount: rawText.length,
    },
  };
}

module.exports = { extractTxt };
