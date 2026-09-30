const fs = require("fs");
const PDFParser = require("pdf2json");
const { createHttpError } = require("../../middleware/errorMiddleware");

async function extractPdf(filePath) {
  if (!fs.existsSync(filePath)) {
    throw createHttpError(400, "PDF file does not exist in storage.");
  }

  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1);

    pdfParser.on("pdfParser_dataError", (errData) => {
      const errMsg = errData?.parserError?.message || errData?.parserError || "Corrupted or unreadable PDF file.";
      reject(createHttpError(400, typeof errMsg === "string" ? errMsg : "Failed to parse PDF document."));
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

        if (pages.length === 0) {
          return reject(createHttpError(400, "No extractable text found in this PDF."));
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
        reject(createHttpError(400, `Error processing extracted PDF text: ${err.message}`));
      }
    });

    try {
      pdfParser.loadPDF(filePath);
    } catch (err) {
      reject(createHttpError(400, `Failed to load PDF file: ${err.message}`));
    }
  });
}

module.exports = { extractPdf };
