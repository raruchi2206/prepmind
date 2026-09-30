const fs = require("fs").promises;
const { createHttpError } = require("../../middleware/errorMiddleware");

async function extractTxt(filePath) {
  let content;
  try {
    content = await fs.readFile(filePath, "utf8");
  } catch (err) {
    throw createHttpError(400, `Unable to read text file: ${err.message}`);
  }

  const rawText = content.trim();
  if (!rawText) {
    throw createHttpError(400, "Text file is empty or contains only whitespace.");
  }

  const words = rawText.split(/\s+/).filter(Boolean);

  return {
    items: [{ text: rawText }],
    metadata: {
      pageCount: null,
      wordCount: words.length,
    },
  };
}

module.exports = { extractTxt };
