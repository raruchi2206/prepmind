const mammoth = require("mammoth");
const { createHttpError } = require("../../middleware/errorMiddleware");

async function extractDocx(filePath) {
  let result;
  try {
    result = await mammoth.extractRawText({ path: filePath });
  } catch (err) {
    throw createHttpError(400, `Corrupted or unreadable DOCX file: ${err.message}`);
  }

  const rawText = (result.value || "").trim();
  if (!rawText) {
    throw createHttpError(400, "No extractable text found in this DOCX document.");
  }

  const words = rawText.split(/\s+/).filter(Boolean);

  return {
    items: [{ text: rawText }],
    metadata: {
      pageCount: null, // DOCX does not have fixed pagination
      wordCount: words.length,
    },
  };
}

module.exports = { extractDocx };
