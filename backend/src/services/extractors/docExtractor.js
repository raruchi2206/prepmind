const fs = require("fs");
const WordExtractor = require("word-extractor");
const { createHttpError } = require("../../middleware/errorMiddleware");

async function extractDoc(filePath) {
  if (!fs.existsSync(filePath)) {
    throw createHttpError(400, "DOC file does not exist in storage.");
  }

  try {
    const extractor = new WordExtractor();
    const extracted = await extractor.extract(filePath);
    const body = (extracted.getBody() || "").trim();

    if (!body) {
      throw createHttpError(400, "No extractable text found in this DOC document.");
    }

    const words = body.split(/\s+/).filter(Boolean);

    return {
      items: [{ text: body }],
      metadata: {
        pageCount: null,
        wordCount: words.length,
      },
    };
  } catch (err) {
    if (err.statusCode) throw err;
    throw createHttpError(400, `Corrupted or unreadable DOC file: ${err.message}`);
  }
}

module.exports = { extractDoc };
