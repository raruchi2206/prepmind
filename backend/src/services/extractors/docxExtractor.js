const mammoth = require("mammoth");
const { createHttpError } = require("../../middleware/errorMiddleware");

function htmlToStructuredText(html) {
  let text = html
    .replace(/<tr[^>]*>/gi, "\n")
    .replace(/<t[hd][^>]*>/gi, " | ")
    .replace(/<\/t[hd]>/gi, "")
    .replace(/<\/tr>/gi, " |")
    .replace(/<\/table>/gi, "\n\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, ""); // strip remaining HTML tags

  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");
}

async function extractDocx(filePath) {
  let structuredText = "";
  let rawText = "";

  try {
    const htmlResult = await mammoth.convertToHtml({ path: filePath });
    if (htmlResult && htmlResult.value) {
      structuredText = htmlToStructuredText(htmlResult.value);
    }
  } catch (err) {
    // Fall back to raw text extraction below
  }

  if (!structuredText) {
    try {
      const rawResult = await mammoth.extractRawText({ path: filePath });
      rawText = (rawResult.value || "").trim();
    } catch (err) {
      throw createHttpError(400, `Corrupted or unreadable DOCX file: ${err.message}`);
    }
  }

  const finalText = (structuredText || rawText).trim();
  if (!finalText) {
    throw createHttpError(400, "No extractable text found in this DOCX document.");
  }

  const words = finalText.split(/\s+/).filter(Boolean);

  return {
    items: [{ text: finalText }],
    metadata: {
      pageCount: null, // DOCX does not have fixed pagination
      wordCount: words.length,
    },
  };
}

module.exports = { extractDocx };
