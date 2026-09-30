const AdmZip = require("adm-zip");
const { createHttpError } = require("../../middleware/errorMiddleware");

function decodeXmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function extractPptx(filePath) {
  let zip;
  try {
    zip = new AdmZip(filePath);
  } catch (err) {
    throw createHttpError(400, `Corrupted or unreadable PPTX file: ${err.message}`);
  }

  const zipEntries = zip.getEntries();
  const slideEntries = [];

  for (const entry of zipEntries) {
    const match = entry.entryName.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
    if (match) {
      slideEntries.push({
        slideNum: parseInt(match[1], 10),
        entry,
      });
    }
  }

  if (slideEntries.length === 0) {
    throw createHttpError(400, "No slides found in this PPTX presentation.");
  }

  // Sort slides numerically
  slideEntries.sort((a, b) => a.slideNum - b.slideNum);

  const items = [];
  let totalWords = 0;

  for (const item of slideEntries) {
    const xmlContent = item.entry.getData().toString("utf8");
    // Extract text from <a:t>...</a:t> and <a:p> tags
    const textMatches = xmlContent.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi) || [];
    const slideTextParts = textMatches.map((tag) => {
      const match = tag.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/i);
      return match ? decodeXmlEntities(match[1]) : "";
    });

    const slideText = slideTextParts.join(" ").trim();
    if (slideText) {
      items.push({
        slide: item.slideNum,
        text: slideText,
      });
      totalWords += slideText.split(/\s+/).filter(Boolean).length;
    }
  }

  if (items.length === 0) {
    throw createHttpError(400, "No extractable text found in this PPTX presentation.");
  }

  return {
    items,
    metadata: {
      pageCount: slideEntries.length, // total slide count
      wordCount: totalWords,
    },
  };
}

module.exports = { extractPptx };
