import { jsPDF } from "jspdf";
import { marked } from "marked";

/**
 * PrepMind Academic Document Theme & Styling Constants
 */
const THEME = {
  fontTitle: "times",
  fontBody: "helvetica",
  fontMono: "courier",
  margin: 20,
  pageBottom: 272,
  primaryDark: [35, 26, 18],       // Rich espresso brown (#231A12)
  accentBrown: [140, 90, 48],      // Restrained warm brown (#8C5A30)
  accentLight: [245, 240, 235],    // Subtle warm background tint
  bodyText: [43, 37, 32],          // High-contrast readable charcoal (#2B2520)
  secondaryText: [110, 100, 92],   // Subdued metadata gray (#6E645C)
  borderTone: [215, 205, 195],     // Warm subtle rule/divider
  tableHeaderBg: [244, 239, 233],  // Table header fill (#F4EFEB)
  tableBorder: [220, 212, 203],    // Table cell borders
  correctGreen: [29, 110, 56],     // Emerald correct answer (#1D6E38)
  incorrectRed: [168, 40, 40],     // High-contrast incorrect answer (#A82828)
  warningAmber: [180, 83, 9],      // Unanswered indicator (#B45309)
};

function sanitizeFilename(title, fallback = "Document") {
  if (!title) return fallback;
  return (
    title
      .replace(/^Summary:\s*/i, "")
      .replace(/^Notes:\s*/i, "")
      .replace(/^Quiz:\s*/i, "")
      .replace(/^Practice Paper:\s*/i, "")
      .replace(/^Viva:\s*/i, "")
      .replace(/[^a-zA-Z0-9_\- ]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 50) || fallback
  );
}

/**
 * Normalizes LaTeX mathematics and raw notation into clean, high-readability text
 */
function cleanMathNotation(text) {
  if (!text) return "";
  let s = String(text);

  // Greek letters (WinAnsi-safe names)
  s = s.replace(/\\alpha\b/g, "alpha")
    .replace(/\\beta\b/g, "beta")
    .replace(/\\gamma\b/g, "gamma")
    .replace(/\\delta\b/g, "delta")
    .replace(/\\Delta\b/g, "Delta")
    .replace(/\\epsilon\b/g, "epsilon")
    .replace(/\\theta\b/g, "theta")
    .replace(/\\lambda\b/g, "lambda")
    .replace(/\\mu\b/g, "mu")
    .replace(/\\pi\b/g, "pi")
    .replace(/\\sigma\b/g, "sigma")
    .replace(/\\omega\b/g, "omega")
    .replace(/\\Omega\b/g, "Omega");

  // Math operators & symbols
  s = s.replace(/\\times\b/g, "*")
    .replace(/\\cdot\b/g, "*")
    .replace(/\\pm\b/g, "+/-")
    .replace(/\\mp\b/g, "-/+")
    .replace(/\\div\b/g, "/")
    .replace(/\\approx\b/g, "~=")
    .replace(/\\equiv\b/g, "==")
    .replace(/\\neq\b/g, "!=")
    .replace(/\\le(q)?\b/g, "<=")
    .replace(/\\ge(q)?\b/g, ">=")
    .replace(/\\infty\b/g, "infinity")
    .replace(/\\sum(?:_\{([^}]+)\})?(?:\^\{([^}]+)\})?/g, (m, b, t) => `Sum${b ? ` (${b}` : ""}${t ? `..${t})` : (b ? ")" : "")}`)
    .replace(/\\int(?:_\{([^}]+)\})?(?:\^\{([^}]+)\})?/g, (m, b, t) => `Integral${b ? ` (${b}` : ""}${t ? `..${t})` : (b ? ")" : "")}`)
    .replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)")
    .replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, "($2)^(1/$1)")
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\mathbf\{([^}]+)\}/g, "$1")
    .replace(/\\mathit\{([^}]+)\}/g, "$1")
    .replace(/\\left\(/g, "(")
    .replace(/\\right\)/g, ")")
    .replace(/\\left\[/g, "[")
    .replace(/\\right\]/g, "]")
    .replace(/\\to\b|\\rightarrow\b/g, "->")
    .replace(/\\Rightarrow\b/g, "=>");

  // Recursively resolve nested fractions like \frac{1}{(1-p) + \frac{p}{s}}
  let prevFrac = "";
  while (prevFrac !== s) {
    prevFrac = s;
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1 / $2)");
  }

  // Superscripts & Subscripts common patterns
  s = s.replace(/\^2\b/g, "^2")
    .replace(/\^3\b/g, "^3")
    .replace(/\^n\b/g, "^n")
    .replace(/_i\b/g, "[i]")
    .replace(/_j\b/g, "[j]")
    .replace(/_1\b/g, "[1]")
    .replace(/_2\b/g, "[2]")
    .replace(/_0\b/g, "[0]");

  // Delimiters
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, "$1")
    .replace(/\$([^\$\n]+?)\$/g, "$1")
    .replace(/\\\[([\s\S]*?)\\\]/g, "$1")
    .replace(/\\\(([\s\S]*?)\\\)/g, "$1");

  return s;
}

/**
 * Cleans plain text while preserving semantic math & terminology, keeping within printable font bounds
 */
function cleanInlineText(text) {
  if (!text) return "";
  let s = cleanMathNotation(text);
  // Remove markdown bold/italic asterisks while preserving content
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    // Remove decorative modern emojis that corrupt standard PDF fonts
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/gu, "")
    // Remove any leftover characters outside standard printable Latin character set
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

/**
 * Professional Header & Footer with consistent page numbering
 */
function addRunningHeaderAndFooter(doc, documentTitle, category = "STUDY DOCUMENT") {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = THEME.margin;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setCharSpace(0);

    // Running Header (pages 2+)
    if (i > 1) {
      doc.setFont(THEME.fontBody, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...THEME.secondaryText);
      doc.text(`PREPMIND  |  ${String(category).toUpperCase()}`, margin, 12);
      const safeTitle = cleanInlineText(documentTitle || "Document").slice(0, 48);
      doc.text(safeTitle, pageWidth - margin, 12, { align: "right" });

      doc.setDrawColor(...THEME.borderTone);
      doc.setLineWidth(0.3);
      doc.line(margin, 15, pageWidth - margin, 15);
    }

    // Running Footer (all pages)
    doc.setFont(THEME.fontBody, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...THEME.secondaryText);
    doc.setDrawColor(...THEME.borderTone);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.text("PrepMind Academic Learning Platform", margin, pageHeight - 9);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 9, { align: "right" });
  }
}

/**
 * Renders structured Markdown tokens into jsPDF with true tables, headings, and formatting
 */
function renderMarkdownDocument(doc, rawMarkdown, startY, maxWidth) {
  let y = startY;
  const margin = THEME.margin;
  const pageWidth = doc.internal.pageSize.getWidth();

  const ensureSpace = (neededHeight) => {
    if (y + neededHeight > THEME.pageBottom) {
      doc.addPage();
      doc.setCharSpace(0);
      y = 25;
      return true;
    }
    return false;
  };

  const tokens = marked.lexer(rawMarkdown || "");

  for (const token of tokens) {
    doc.setCharSpace(0);

    if (token.type === "heading") {
      const level = token.depth;
      const text = cleanInlineText(token.text);

      if (level === 1) {
        ensureSpace(18);
        y += 4;
        doc.setFont(THEME.fontTitle, "bold");
        doc.setFontSize(16);
        doc.setTextColor(...THEME.primaryDark);
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, margin, y);
        y += lines.length * 6.5 + 2;

        doc.setDrawColor(...THEME.accentBrown);
        doc.setLineWidth(0.6);
        doc.line(margin, y, margin + 45, y);
        y += 5;
      } else if (level === 2) {
        ensureSpace(14);
        y += 3;
        doc.setFont(THEME.fontTitle, "bold");
        doc.setFontSize(12.5);
        doc.setTextColor(...THEME.primaryDark);
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, margin, y);
        y += lines.length * 5.5 + 2;

        doc.setDrawColor(...THEME.borderTone);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;
      } else {
        ensureSpace(10);
        y += 2;
        doc.setFont(THEME.fontTitle, "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(...THEME.accentBrown);
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 2;
      }
    } else if (token.type === "paragraph") {
      const rawText = token.text || "";

      // Check if this paragraph is a display math block ($$...$$)
      if (rawText.startsWith("$$") && rawText.endsWith("$$")) {
        const mathContent = cleanInlineText(cleanMathNotation(rawText.slice(2, -2).trim()));
        ensureSpace(16);
        y += 2;

        // Draw styled math formula card
        doc.setFillColor(...THEME.accentLight);
        doc.setDrawColor(...THEME.borderTone);
        doc.roundedRect(margin, y, maxWidth, 14, 1.5, 1.5, "FD");

        // Left accent bar
        doc.setFillColor(...THEME.accentBrown);
        doc.rect(margin, y, 2.5, 14, "F");

        doc.setFont(THEME.fontTitle, "italic");
        doc.setFontSize(10);
        doc.setTextColor(...THEME.primaryDark);
        doc.text(mathContent, margin + 8, y + 9);
        y += 18;
        continue;
      }

      const text = cleanInlineText(rawText);
      if (!text) continue;

      ensureSpace(8);
      doc.setFont(THEME.fontBody, "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...THEME.bodyText);
      const lines = doc.splitTextToSize(text, maxWidth);
      for (const line of lines) {
        ensureSpace(5);
        doc.text(line, margin, y);
        y += 4.8;
      }
      y += 2;
    } else if (token.type === "list") {
      const items = token.items || [];
      const ordered = Boolean(token.ordered);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemText = cleanInlineText(item.text);
        if (!itemText) continue;

        ensureSpace(7);
        const prefix = ordered ? `${i + 1}.` : "-";
        doc.setFont(THEME.fontBody, "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(...THEME.accentBrown);
        doc.text(prefix, margin + 2, y);

        doc.setFont(THEME.fontBody, "normal");
        doc.setTextColor(...THEME.bodyText);
        const lines = doc.splitTextToSize(itemText, maxWidth - 8);
        for (let j = 0; j < lines.length; j++) {
          ensureSpace(5);
          doc.text(lines[j], margin + (ordered ? 8 : 7), y);
          y += 4.8;
        }
        y += 1.2;
      }
      y += 2;
    } else if (token.type === "table") {
      // TRUE MARKDOWN TABLE RENDERING WITH WRAPPING AND REPEATED HEADERS
      const headers = (token.header || []).map((h) => cleanInlineText(h.text || String(h)));
      const rows = (token.rows || []).map((row) =>
        (row || []).map((cell) => cleanInlineText(cell.text || String(cell)))
      );

      if (headers.length > 0) {
        ensureSpace(20);
        const colCount = headers.length;
        const colWidth = maxWidth / colCount;
        const cellPadding = 2.5;

        const drawTableRow = (cells, isHeader = false) => {
          doc.setFont(THEME.fontBody, isHeader ? "bold" : "normal");
          doc.setFontSize(8.5);

          const cellLinesList = cells.map((cellText) =>
            doc.splitTextToSize(cellText || "", colWidth - cellPadding * 2)
          );
          const maxLines = Math.max(1, ...cellLinesList.map((l) => l.length));
          const rowHeight = maxLines * 4.2 + cellPadding * 2;

          ensureSpace(rowHeight);

          for (let c = 0; c < colCount; c++) {
            const cellX = margin + c * colWidth;
            if (isHeader) {
              doc.setFillColor(...THEME.tableHeaderBg);
              doc.setDrawColor(...THEME.tableBorder);
              doc.rect(cellX, y, colWidth, rowHeight, "FD");
            } else {
              doc.setFillColor(255, 255, 255);
              doc.setDrawColor(...THEME.tableBorder);
              doc.rect(cellX, y, colWidth, rowHeight, "FD");
            }

            doc.setTextColor(...(isHeader ? THEME.primaryDark : THEME.bodyText));
            const lines = cellLinesList[c] || [];
            lines.forEach((line, lineIdx) => {
              doc.text(line, cellX + cellPadding, y + cellPadding + 3.2 + lineIdx * 4.2);
            });
          }

          y += rowHeight;
        };

        drawTableRow(headers, true);

        for (const rowCells of rows) {
          const wouldOverflow = y + 15 > THEME.pageBottom;
          if (wouldOverflow) {
            doc.addPage();
            doc.setCharSpace(0);
            y = 25;
            drawTableRow(headers, true); // Repeat table header on continuation page
          }
          drawTableRow(rowCells, false);
        }
        y += 4;
      }
    } else if (token.type === "code") {
      ensureSpace(15);
      const codeLines = (token.text || "").split("\n");
      const blockHeight = Math.min(codeLines.length * 4.2 + 6, 80);

      doc.setFillColor(...THEME.accentLight);
      doc.setDrawColor(...THEME.borderTone);
      doc.roundedRect(margin, y, maxWidth, blockHeight, 1.5, 1.5, "FD");

      doc.setFont(THEME.fontMono, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...THEME.primaryDark);

      let lineY = y + 4.5;
      for (const line of codeLines.slice(0, 18)) {
        if (lineY > y + blockHeight - 2) break;
        doc.text(line.slice(0, 85), margin + 4, lineY);
        lineY += 4.2;
      }
      y += blockHeight + 4;
    } else if (token.type === "space") {
      y += 2;
    } else if (token.type === "hr") {
      ensureSpace(6);
      doc.setDrawColor(...THEME.borderTone);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
    }
  }

  return y;
}

/**
 * 1. Build Academic Summary PDF Document
 */
export function createSummaryPDFDocument(summaryData, sourceTitle = "Knowledge Source") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setCharSpace(0);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = THEME.margin;
  const maxWidth = pageWidth - margin * 2;
  let y = 24;

  const rawTitle = summaryData.title
    ? summaryData.title.replace(/^Summary:\s*/i, "")
    : `Summary of ${sourceTitle}`;
  const displayTitle = cleanInlineText(rawTitle);

  // Institution Brand Eyebrow
  doc.setFont(THEME.fontBody, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...THEME.accentBrown);
  doc.text("PREPMIND  |  ACADEMIC REVISION SUMMARY", margin, y);
  y += 7;

  // Title
  doc.setFont(THEME.fontTitle, "bold");
  doc.setFontSize(18);
  doc.setTextColor(...THEME.primaryDark);
  const titleLines = doc.splitTextToSize(displayTitle, maxWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 2;

  // Metadata Card
  doc.setFont(THEME.fontBody, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...THEME.secondaryText);
  doc.text(`Source Document: ${cleanInlineText(sourceTitle)}   |   Generated: ${new Date().toLocaleDateString()}`, margin, y);
  y += 4;

  doc.setDrawColor(...THEME.accentBrown);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // Render structured content
  renderMarkdownDocument(doc, summaryData.content || "", y, maxWidth);

  // Apply running headers and footers across all pages
  addRunningHeaderAndFooter(doc, displayTitle, "Executive Summary");

  return doc;
}

export function generateSummaryPDF(summaryData, sourceTitle = "Knowledge Source") {
  const doc = createSummaryPDFDocument(summaryData, sourceTitle);
  const filename = `PrepMind_${sanitizeFilename(sourceTitle)}_Summary.pdf`;
  doc.save(filename);
}

/**
 * 2. Build Academic Study Notes PDF Document
 */
export function createNotesPDFDocument(notesData, sourceTitle = "Knowledge Source") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setCharSpace(0);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = THEME.margin;
  const maxWidth = pageWidth - margin * 2;
  let y = 24;

  const rawTitle = notesData.title
    ? notesData.title.replace(/^Notes:\s*/i, "")
    : `Study Notes: ${sourceTitle}`;
  const displayTitle = cleanInlineText(rawTitle);

  // Top Category
  doc.setFont(THEME.fontBody, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...THEME.accentBrown);
  doc.text("PREPMIND  |  COMPREHENSIVE ACADEMIC STUDY NOTES", margin, y);
  y += 7;

  // Title
  doc.setFont(THEME.fontTitle, "bold");
  doc.setFontSize(18);
  doc.setTextColor(...THEME.primaryDark);
  const titleLines = doc.splitTextToSize(displayTitle, maxWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 2;

  // Metadata Line
  doc.setFont(THEME.fontBody, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...THEME.secondaryText);
  doc.text(`Source Document: ${cleanInlineText(sourceTitle)}   |   Academic Course Material`, margin, y);
  y += 4;

  doc.setDrawColor(...THEME.accentBrown);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // Render notes content
  renderMarkdownDocument(doc, notesData.content || "", y, maxWidth);

  addRunningHeaderAndFooter(doc, displayTitle, "Study Notes");
  return doc;
}

export function generateNotesPDF(notesData, sourceTitle = "Knowledge Source") {
  const doc = createNotesPDFDocument(notesData, sourceTitle);
  const filename = `PrepMind_${sanitizeFilename(sourceTitle)}_Notes.pdf`;
  doc.save(filename);
}

/**
 * 3. Build Blank Quiz Examination Paper PDF Document
 */
export function createQuizQuestionPDFDocument(assessment, sourceTitle = "Knowledge Source") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setCharSpace(0);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = THEME.margin;
  const maxWidth = pageWidth - margin * 2;
  let y = 24;

  const rawTitle = assessment.title
    ? assessment.title.replace(/^Quiz:\s*/i, "")
    : `Quiz: ${sourceTitle}`;
  const displayTitle = cleanInlineText(rawTitle);

  doc.setFont(THEME.fontBody, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...THEME.accentBrown);
  doc.text("PREPMIND  |  ACADEMIC EXAMINATION PAPER", margin, y);
  y += 7;

  doc.setFont(THEME.fontTitle, "bold");
  doc.setFontSize(18);
  doc.setTextColor(...THEME.primaryDark);
  const titleLines = doc.splitTextToSize(displayTitle, maxWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 2;

  doc.setFont(THEME.fontBody, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...THEME.secondaryText);
  doc.text(`Source: ${cleanInlineText(sourceTitle)}   |   Difficulty: ${assessment.difficulty || "Medium"}   |   Total Questions: ${assessment.questions?.length || 0}`, margin, y);
  y += 4;
  doc.setDrawColor(...THEME.borderTone);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // Instructions Card
  doc.setFillColor(...THEME.accentLight);
  doc.roundedRect(margin, y, maxWidth, 18, 1.5, 1.5, "FD");
  doc.setFont(THEME.fontBody, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...THEME.primaryDark);
  doc.text("Instructions for Candidates:", margin + 4, y + 5);
  doc.setFont(THEME.fontBody, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...THEME.bodyText);
  doc.text("1. Read each question carefully and select the single best option.", margin + 4, y + 10);
  doc.text("2. Answer all questions based strictly on the uploaded source material.", margin + 4, y + 14.5);
  y += 24;

  const questions = assessment.questions || [];
  questions.forEach((q, idx) => {
    if (y + 35 > THEME.pageBottom) {
      doc.addPage();
      doc.setCharSpace(0);
      y = 25;
    }

    doc.setFont(THEME.fontBody, "bold");
    doc.setFontSize(10);
    doc.setTextColor(...THEME.primaryDark);
    doc.text(`Question ${idx + 1}`, margin, y);
    y += 5;

    doc.setFont(THEME.fontBody, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...THEME.bodyText);
    const qLines = doc.splitTextToSize(cleanInlineText(q.question), maxWidth);
    doc.text(qLines, margin, y);
    y += qLines.length * 4.8 + 2;

    const optLabels = ["A", "B", "C", "D", "E"];
    (q.options || []).forEach((opt, oIdx) => {
      if (y + 8 > THEME.pageBottom) {
        doc.addPage();
        doc.setCharSpace(0);
        y = 25;
      }
      doc.setFont(THEME.fontBody, "normal");
      doc.setFontSize(9);
      doc.setTextColor(...THEME.bodyText);
      const optText = `${optLabels[oIdx] || "-"}.  ${cleanInlineText(opt)}`;
      const optLines = doc.splitTextToSize(optText, maxWidth - 6);
      doc.text(optLines, margin + 5, y);
      y += optLines.length * 4.5 + 1;
    });

    y += 4;
    doc.setDrawColor(...THEME.borderTone);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  });

  addRunningHeaderAndFooter(doc, displayTitle, "Question Paper");
  return doc;
}

export function generateQuizQuestionPDF(assessment, sourceTitle = "Knowledge Source") {
  const doc = createQuizQuestionPDFDocument(assessment, sourceTitle);
  const filename = `PrepMind_${sanitizeFilename(sourceTitle)}_Quiz_Paper.pdf`;
  doc.save(filename);
}

/**
 * 4. Build Quiz Result & Performance Report PDF Document
 */
export function createQuizResultPDFDocument(assessment, attempt, sourceTitle = "Knowledge Source") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setCharSpace(0);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = THEME.margin;
  const maxWidth = pageWidth - margin * 2;
  let y = 24;

  const rawTitle = assessment.title
    ? assessment.title.replace(/^Quiz:\s*/i, "")
    : `Quiz Result: ${sourceTitle}`;
  const displayTitle = cleanInlineText(rawTitle);

  // Institution Brand Eyebrow
  doc.setFont(THEME.fontBody, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...THEME.accentBrown);
  doc.text("PREPMIND  |  ACADEMIC EVALUATION & RESULT REPORT", margin, y);
  y += 7;

  // Title
  doc.setFont(THEME.fontTitle, "bold");
  doc.setFontSize(18);
  doc.setTextColor(...THEME.primaryDark);
  const titleLines = doc.splitTextToSize(displayTitle, maxWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 2;

  // Performance Calculations
  const questions = assessment.questions || [];
  const answers = attempt.answers || [];
  const totalCount = attempt.totalMarks || questions.length || 1;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const answeredCount = answers.filter(
    (a) => a.userAnswer && String(a.userAnswer).trim() !== "" && String(a.userAnswer).toLowerCase() !== "not answered"
  ).length;
  const unansweredCount = Math.max(0, totalCount - answeredCount);
  const incorrectCount = Math.max(0, totalCount - correctCount - unansweredCount);
  const percentage = attempt.percentage ?? Math.round((correctCount / totalCount) * 100);

  // Score Summary Card
  doc.setFillColor(...THEME.accentLight);
  doc.setDrawColor(...THEME.borderTone);
  doc.roundedRect(margin, y, maxWidth, 32, 2, 2, "FD");

  // Left Score Badge
  doc.setFont(THEME.fontTitle, "bold");
  doc.setFontSize(22);
  doc.setTextColor(...(percentage >= 70 ? THEME.correctGreen : (percentage >= 50 ? THEME.accentBrown : THEME.incorrectRed)));
  doc.text(`${percentage}%`, margin + 6, y + 16);

  doc.setFont(THEME.fontBody, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...THEME.primaryDark);
  doc.text(`Score: ${correctCount} / ${totalCount}`, margin + 6, y + 23);

  // Performance Chips (Right Side)
  const chipsX = margin + 50;
  doc.setFont(THEME.fontBody, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...THEME.secondaryText);
  doc.text(`Source Document: ${cleanInlineText(sourceTitle).slice(0, 40)}`, chipsX, y + 8);
  doc.text(`Difficulty: ${assessment.difficulty || "Medium"}   |   Type: ${assessment.questionType || "MCQ"}   |   Date: ${new Date().toLocaleDateString()}`, chipsX, y + 14);

  // Chip counts
  doc.setFont(THEME.fontBody, "bold");
  doc.setTextColor(...THEME.correctGreen);
  doc.text(`Correct: ${correctCount}`, chipsX, y + 23);

  doc.setTextColor(...THEME.incorrectRed);
  doc.text(`Incorrect: ${incorrectCount}`, chipsX + 32, y + 23);

  doc.setTextColor(...THEME.warningAmber);
  doc.text(`Unanswered: ${unansweredCount}`, chipsX + 66, y + 23);

  y += 40;

  // Questions and Detailed Evaluated Answers
  doc.setFont(THEME.fontTitle, "bold");
  doc.setFontSize(12);
  doc.setTextColor(...THEME.primaryDark);
  doc.text("Questions & Answer Evaluations", margin, y);
  y += 2;
  doc.setDrawColor(...THEME.borderTone);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  questions.forEach((q, idx) => {
    if (y + 40 > THEME.pageBottom) {
      doc.addPage();
      doc.setCharSpace(0);
      y = 25;
    }

    const ans =
      answers.find(
        (a) =>
          (a.questionId != null && String(a.questionId) === String(q.id)) ||
          (q._id && a.questionId != null && String(a.questionId) === String(q._id)) ||
          (a.questionIndex != null && Number(a.questionIndex) === idx) ||
          (a.question && cleanInlineText(a.question).toLowerCase() === cleanInlineText(q.question).toLowerCase())
      ) || (answers && answers[idx] ? answers[idx] : null);

    let rawUserAns = ans?.userAnswer != null ? String(ans.userAnswer).trim() : "";
    if (
      !rawUserAns ||
      rawUserAns === "(None)" ||
      rawUserAns === "None" ||
      rawUserAns === "undefined" ||
      rawUserAns === "null" ||
      rawUserAns.toLowerCase() === "not answered"
    ) {
      rawUserAns = "";
    }

    const isAnswered = Boolean(rawUserAns);
    const isCorrect = Boolean(ans?.isCorrect);

    // Question Header
    doc.setFont(THEME.fontBody, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...THEME.primaryDark);
    doc.text(`Question ${idx + 1} of ${totalCount}`, margin, y);

    // Crisp Status Badge (Vector Pill)
    const badgeW = isCorrect ? 24 : (isAnswered ? 26 : 32);
    const badgeH = 5.5;
    const badgeX = pageWidth - margin - badgeW;
    const badgeY = y - 3.8;

    doc.setFillColor(...(isCorrect ? [235, 248, 238] : (isAnswered ? [254, 238, 238] : [254, 247, 235])));
    doc.setDrawColor(...(isCorrect ? [175, 230, 190] : (isAnswered ? [248, 185, 185] : [248, 215, 170])));
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, "FD");

    doc.setFont(THEME.fontBody, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...(isCorrect ? THEME.correctGreen : (isAnswered ? THEME.incorrectRed : THEME.warningAmber)));
    const badgeText = isCorrect ? "CORRECT" : (isAnswered ? "INCORRECT" : "NOT ANSWERED");
    doc.text(badgeText, badgeX + badgeW / 2, y, { align: "center" });

    y += 5;

    // Question Text
    doc.setFont(THEME.fontBody, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...THEME.bodyText);
    const qLines = doc.splitTextToSize(cleanInlineText(q.question), maxWidth);
    doc.text(qLines, margin, y);
    y += qLines.length * 4.8 + 2;

    const userAnsText = isAnswered ? cleanInlineText(rawUserAns) : "Not Answered";
    const correctAnsText = cleanInlineText(q.correctAnswer || "");

    doc.setFont(THEME.fontBody, "normal");
    doc.setFontSize(9);

    // Student answer
    if (isCorrect) {
      doc.setTextColor(...THEME.correctGreen);
      doc.text(`Your Answer: ${userAnsText}  [Correct]`, margin + 3, y);
    } else if (isAnswered) {
      doc.setTextColor(...THEME.incorrectRed);
      doc.text(`Your Answer: ${userAnsText}  [Incorrect]`, margin + 3, y);
    } else {
      doc.setTextColor(...THEME.warningAmber);
      doc.text(`Your Answer: Not Answered`, margin + 3, y);
    }
    y += 4.5;

    // Correct Answer (if student was incorrect or unanswered)
    if (!isCorrect) {
      doc.setTextColor(...THEME.correctGreen);
      doc.text(`Correct Answer: ${correctAnsText}`, margin + 3, y);
      y += 4.5;
    }

    // Explanation callout
    if (q.explanation) {
      doc.setFont(THEME.fontBody, "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...THEME.secondaryText);
      const expLines = doc.splitTextToSize(`Explanation: ${cleanInlineText(q.explanation)}`, maxWidth - 6);
      doc.text(expLines, margin + 3, y);
      y += expLines.length * 4.2 + 2;
    }

    y += 4;
    doc.setDrawColor(...THEME.borderTone);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  });

  addRunningHeaderAndFooter(doc, displayTitle, "Quiz Result");
  return doc;
}

export function generateQuizResultPDF(assessment, attempt, sourceTitle = "Knowledge Source") {
  const doc = createQuizResultPDFDocument(assessment, attempt, sourceTitle);
  const filename = `PrepMind_${sanitizeFilename(sourceTitle)}_Quiz_Result.pdf`;
  doc.save(filename);
}

/**
 * 5. Build Practice Paper PDF Document
 */
export function createPracticePaperPDFDocument(assessment, sourceTitle = "Knowledge Source") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setCharSpace(0);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = THEME.margin;
  const maxWidth = pageWidth - margin * 2;
  let y = 24;

  const rawTitle = assessment.title
    ? assessment.title.replace(/^Practice Paper:\s*/i, "")
    : `Practice Paper: ${sourceTitle}`;
  const displayTitle = cleanInlineText(rawTitle);

  doc.setFont(THEME.fontBody, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...THEME.accentBrown);
  doc.text("PREPMIND  |  ACADEMIC PRACTICE EXAMINATION PAPER", margin, y);
  y += 7;

  doc.setFont(THEME.fontTitle, "bold");
  doc.setFontSize(18);
  doc.setTextColor(...THEME.primaryDark);
  const titleLines = doc.splitTextToSize(displayTitle, maxWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 2;

  doc.setFont(THEME.fontBody, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...THEME.secondaryText);
  doc.text(`Source: ${cleanInlineText(sourceTitle)}   |   Total Marks: ${assessment.totalMarks || 60}   |   Time: 2 Hours`, margin, y);
  y += 4;
  doc.setDrawColor(...THEME.accentBrown);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Sections
  const sections = assessment.sections || [];
  sections.forEach((sec, sIdx) => {
    if (y + 25 > THEME.pageBottom) {
      doc.addPage();
      doc.setCharSpace(0);
      y = 25;
    }

    doc.setFont(THEME.fontTitle, "bold");
    doc.setFontSize(12);
    doc.setTextColor(...THEME.primaryDark);
    doc.text(`Section ${String.fromCharCode(65 + sIdx)}: ${cleanInlineText(sec.title || "General")}`, margin, y);
    y += 5;

    const questions = sec.questions || [];
    questions.forEach((q, qIdx) => {
      if (y + 20 > THEME.pageBottom) {
        doc.addPage();
        doc.setCharSpace(0);
        y = 25;
      }
      doc.setFont(THEME.fontBody, "bold");
      doc.setFontSize(9);
      doc.setTextColor(...THEME.primaryDark);
      doc.text(`Q${qIdx + 1}. [${q.marks || 5} Marks]`, margin, y);
      y += 4.5;

      doc.setFont(THEME.fontBody, "normal");
      doc.setFontSize(9);
      doc.setTextColor(...THEME.bodyText);
      const qLines = doc.splitTextToSize(cleanInlineText(q.question), maxWidth);
      doc.text(qLines, margin, y);
      y += qLines.length * 4.5 + 4;
    });

    y += 3;
  });

  addRunningHeaderAndFooter(doc, displayTitle, "Practice Paper");
  return doc;
}

export function generatePracticePaperPDF(assessment, sourceTitle = "Knowledge Source") {
  const doc = createPracticePaperPDFDocument(assessment, sourceTitle);
  const filename = `PrepMind_${sanitizeFilename(sourceTitle)}_Practice_Paper.pdf`;
  doc.save(filename);
}

/**
 * 6. Build Practice Solutions PDF Document
 */
export function createPracticeSolutionsPDFDocument(assessment, sourceTitle = "Knowledge Source") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setCharSpace(0);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = THEME.margin;
  const maxWidth = pageWidth - margin * 2;
  let y = 24;

  const rawTitle = `Solutions: ${assessment.title || sourceTitle}`;
  const displayTitle = cleanInlineText(rawTitle);

  doc.setFont(THEME.fontBody, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...THEME.accentBrown);
  doc.text("PREPMIND  |  MODEL SOLUTIONS & MARKING SCHEME", margin, y);
  y += 7;

  doc.setFont(THEME.fontTitle, "bold");
  doc.setFontSize(18);
  doc.setTextColor(...THEME.primaryDark);
  const titleLines = doc.splitTextToSize(displayTitle, maxWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 2;

  const sections = assessment.sections || [];
  sections.forEach((sec, sIdx) => {
    if (y + 25 > THEME.pageBottom) {
      doc.addPage();
      doc.setCharSpace(0);
      y = 25;
    }
    doc.setFont(THEME.fontTitle, "bold");
    doc.setFontSize(12);
    doc.setTextColor(...THEME.primaryDark);
    doc.text(`Section ${String.fromCharCode(65 + sIdx)} Solutions`, margin, y);
    y += 6;

    (sec.questions || []).forEach((q, qIdx) => {
      if (y + 25 > THEME.pageBottom) {
        doc.addPage();
        doc.setCharSpace(0);
        y = 25;
      }
      doc.setFont(THEME.fontBody, "bold");
      doc.setFontSize(9);
      doc.setTextColor(...THEME.primaryDark);
      doc.text(`Q${qIdx + 1}. ${cleanInlineText(q.question).slice(0, 60)}...`, margin, y);
      y += 4.5;

      doc.setFont(THEME.fontBody, "normal");
      doc.setFontSize(9);
      doc.setTextColor(...THEME.correctGreen);
      const solLines = doc.splitTextToSize(`Model Answer: ${cleanInlineText(q.expectedAnswer || q.solution || "Refer to course notes.")}`, maxWidth);
      doc.text(solLines, margin, y);
      y += solLines.length * 4.5 + 4;
    });
  });

  addRunningHeaderAndFooter(doc, displayTitle, "Solutions");
  return doc;
}

export function generatePracticeSolutionsPDF(assessment, sourceTitle = "Knowledge Source") {
  const doc = createPracticeSolutionsPDFDocument(assessment, sourceTitle);
  const filename = `PrepMind_${sanitizeFilename(sourceTitle)}_Solutions.pdf`;
  doc.save(filename);
}

/**
 * 7. Build Viva Result PDF Document
 */
export function createVivaResultPDFDocument(assessment, results = [], sourceTitle = "Knowledge Source") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setCharSpace(0);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = THEME.margin;
  const maxWidth = pageWidth - margin * 2;
  let y = 24;

  const rawTitle = `Viva Examination Result: ${sourceTitle}`;
  const displayTitle = cleanInlineText(rawTitle);

  doc.setFont(THEME.fontBody, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...THEME.accentBrown);
  doc.text("PREPMIND  |  ORAL VIVA EVALUATION REPORT", margin, y);
  y += 7;

  doc.setFont(THEME.fontTitle, "bold");
  doc.setFontSize(18);
  doc.setTextColor(...THEME.primaryDark);
  const titleLines = doc.splitTextToSize(displayTitle, maxWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 4;

  const questions = assessment.questions || [];
  questions.forEach((q, idx) => {
    if (y + 30 > THEME.pageBottom) {
      doc.addPage();
      doc.setCharSpace(0);
      y = 25;
    }
    const evalData = results[idx] || {};

    doc.setFont(THEME.fontBody, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...THEME.primaryDark);
    doc.text(`Viva Question ${idx + 1}: ${cleanInlineText(q.question)}`, margin, y);
    y += 5;

    doc.setFont(THEME.fontBody, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...THEME.bodyText);
    doc.text(`Candidate Response: ${cleanInlineText(evalData.userAnswer || "No transcript recorded.")}`, margin + 3, y);
    y += 4.5;

    doc.setTextColor(...THEME.accentBrown);
    doc.text(`Examiner Feedback: ${cleanInlineText(evalData.feedback || "Satisfactory academic grounding.")}`, margin + 3, y);
    y += 4.5;

    doc.setFont(THEME.fontBody, "bold");
    doc.setTextColor(...THEME.primaryDark);
    doc.text(`Marks Awarded: ${evalData.marksObtained ?? 4} / ${evalData.maxMarks ?? 5}`, margin + 3, y);
    y += 7;
  });

  addRunningHeaderAndFooter(doc, displayTitle, "Viva Result");
  return doc;
}

export function generateVivaResultPDF(assessment, results = [], sourceTitle = "Knowledge Source") {
  const doc = createVivaResultPDFDocument(assessment, results, sourceTitle);
  const filename = `PrepMind_${sanitizeFilename(sourceTitle)}_Viva_Result.pdf`;
  doc.save(filename);
}
