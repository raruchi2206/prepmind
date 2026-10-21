const fs = require("fs");
const { createHttpError } = require("../../middleware/errorMiddleware");

async function extractPpt(filePath) {
  if (!fs.existsSync(filePath)) {
    throw createHttpError(400, "PPT file does not exist in storage.");
  }

  // Check if file is an OpenXML presentation (.pptx) named with .ppt extension
  try {
    const AdmZip = require("adm-zip");
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    const hasPptxStructure = entries.some((e) => e.entryName.startsWith("ppt/"));
    if (hasPptxStructure) {
      const { extractPptx } = require("./pptxExtractor");
      return await extractPptx(filePath);
    }
  } catch {
    // Not a zip file, it's binary OLE2 format
  }

  // Attempt binary text stream recovery or return documented limitation
  try {
    const buf = fs.readFileSync(filePath);
    const isOle2 =
      buf.length > 8 &&
      buf[0] === 0xd0 &&
      buf[1] === 0xcf &&
      buf[2] === 0x11 &&
      buf[3] === 0xe0;

    if (isOle2) {
      // In this environment, binary OLE2 .ppt requires conversion to modern .pptx
      throw createHttpError(
        400,
        "Legacy PowerPoint (.ppt) format requires conversion to modern .pptx in this environment. Please save your presentation as .pptx and upload again.",
      );
    }
  } catch (err) {
    if (err.statusCode) throw err;
  }

  throw createHttpError(
    400,
    "Legacy PowerPoint (.ppt) format is not directly supported without modern OpenXML format (.pptx). Please convert to .pptx and re-upload.",
  );
}

module.exports = { extractPpt };
