const fs = require("fs");
const { createHttpError } = require("../../middleware/errorMiddleware");
const aiServiceClient = require("../aiServiceClient");
const PDFParser = require("pdf2json");

async function extractWithPdf2Json(filePath) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1);

    pdfParser.on("pdfParser_dataError", (errData) => {
      const errMsg =
        errData?.parserError?.message ||
        errData?.parserError ||
        "Corrupted or unreadable PDF file.";
      reject(new Error(typeof errMsg === "string" ? errMsg : "Failed to parse PDF document."));
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      try {
        const pages = [];
        let pageNumber = 1;

        for (const rawPage of pdfData.Pages || []) {
          const pageTokens = [];

          for (const textItem of rawPage.Texts || []) {
            const decoded = (textItem.R || [])
              .map((r) => {
                try {
                  return decodeURIComponent(r.T);
                } catch {
                  return r.T || "";
                }
              })
              .join("");

            if (decoded) {
              pageTokens.push(decoded);
            }
          }

          const pageText = pageTokens.join(" ").replace(/\s+/g, " ").trim();
          if (pageText) {
            pages.push({
              page: pageNumber,
              text: pageText,
            });
          }
          pageNumber++;
        }

        const totalWords = pages.reduce(
          (acc, p) => acc + p.text.split(/\s+/).filter(Boolean).length,
          0,
        );

        resolve({
          items: pages,
          metadata: {
            pageCount: (pdfData.Pages && pdfData.Pages.length) || pages.length || 1,
            wordCount: totalWords,
          },
        });
      } catch (err) {
        reject(err);
      }
    });

    try {
      pdfParser.loadPDF(filePath);
    } catch (err) {
      reject(err);
    }
  });
}

async function extractPdf(filePath) {
  if (!fs.existsSync(filePath)) {
    throw createHttpError(400, "PDF file does not exist in storage.");
  }

  let extracted = null;

  // 1. Primary extraction via AI Service (Python pypdf + OCR fallback)
  try {
    const aiResult = await aiServiceClient.extractPdf(filePath);
    if (aiResult && aiResult.success && Array.isArray(aiResult.items)) {
      extracted = {
        items: aiResult.items,
        metadata: {
          pageCount: aiResult.metadata?.pageCount || aiResult.items.length || 1,
          wordCount: aiResult.metadata?.wordCount || 0,
        },
      };
    }
  } catch (aiErr) {
    console.warn(`[INGESTION] AI service PDF extraction failed, falling back to local extractor: ${aiErr.message}`);
  }

  // 2. Local fallback if AI Service extraction didn't produce result
  if (!extracted || !extracted.items || extracted.items.length === 0) {
    try {
      extracted = await extractWithPdf2Json(filePath);
    } catch (localErr) {
      console.warn(`[INGESTION] Local pdf2json extraction error: ${localErr.message}`);
    }
  }

  const pages = extracted?.items || [];
  const pageCount = extracted?.metadata?.pageCount || pages.length || 1;
  const totalChars = pages.reduce((acc, p) => acc + (p.text ? p.text.length : 0), 0);
  const totalWords = pages.reduce(
    (acc, p) => acc + (p.text ? p.text.split(/\s+/).filter(Boolean).length : 0),
    0,
  );

  console.log(`[INGESTION]\nfile = ${filePath}\npages = ${pageCount}\nextracted_chars = ${totalChars}`);

  if (totalChars === 0 || pages.length === 0) {
    throw createHttpError(400, "PDF contains no extractable text and OCR could not recover text.");
  }

  return {
    items: pages,
    metadata: {
      pageCount,
      wordCount: totalWords,
    },
  };
}

module.exports = { extractPdf };

