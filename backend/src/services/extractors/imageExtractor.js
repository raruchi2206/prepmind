const fs = require("fs");
const { createHttpError } = require("../../middleware/errorMiddleware");
const aiServiceClient = require("../aiServiceClient");

async function extractImage(filePath) {
  if (!fs.existsSync(filePath)) {
    throw createHttpError(400, "Image file does not exist in storage.");
  }

  let aiResult;
  try {
    aiResult = await aiServiceClient.extractImage(filePath);
  } catch (err) {
    throw createHttpError(
      400,
      `OCR extraction failed: ${err.message || "Could not read text from image"}`,
    );
  }

  if (!aiResult || !aiResult.items || aiResult.items.length === 0) {
    throw createHttpError(
      400,
      "No readable text was extracted from this image via OCR.",
    );
  }

  return {
    items: aiResult.items,
    metadata: {
      pageCount: aiResult.metadata?.pageCount || 1,
      wordCount: aiResult.metadata?.wordCount || 0,
      charCount: aiResult.metadata?.charCount || 0,
    },
  };
}

module.exports = { extractImage };
