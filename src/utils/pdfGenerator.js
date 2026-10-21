import { jsPDF } from "jspdf";

function sanitizeFilename(title, fallback = "Document") {
  if (!title) return fallback;
  return title
    .replace(/^Summary:\s*/i, "")
    .replace(/^Notes:\s*/i, "")
    .replace(/^Quiz:\s*/i, "")
    .replace(/^Practice Paper:\s*/i, "")
    .replace(/^Viva:\s*/i, "")
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 50) || fallback;
}

function cleanText(text) {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*{1,3}(.*?)\*{1,3}/g, "$1")
    .replace(/^[-=_]{3,}\s*$/gm, "")
    .replace(/`/g, "")
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/gu, "")
    .trim();
}

function addHeaderAndFooter(doc, title, category) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Header (pages after page 1)
    if (i > 1) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text("PREPMIND  |  " + category.toUpperCase(), 20, 12);
      doc.text(title.slice(0, 45), pageWidth - 20, 12, { align: "right" });
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(20, 15, pageWidth - 20, 15);
    }

    // Footer on all pages
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);

    doc.text("PrepMind Academic Learning Platform", 20, pageHeight - 10);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: "right" });
  }
}

/**
 * 1. Download Academic Summary PDF
 */
export function generateSummaryPDF(summaryData, sourceTitle = "Knowledge Source") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 22;

  const rawTitle = summaryData.title ? summaryData.title.replace(/^Summary:\s*/, "") : `Summary of ${sourceTitle}`;
  const displayTitle = cleanText(rawTitle);

  // Document Branding Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(140, 100, 30);
  doc.text("PREPMIND ACADEMIC SUMMARY", margin, y);
  y += 7;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  const titleLines = doc.splitTextToSize(displayTitle, maxWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 2;

  // Metadata block
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Source Document: ${sourceTitle}   |   Generated: ${new Date().toLocaleDateString()}`, margin, y);
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Content rendering
  const cleanedContent = cleanText(summaryData.content || "");
  const lines = cleanedContent.split("\n");

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      y += 3;
      continue;
    }

    // Check page overflow
    if (y > 270) {
      doc.addPage();
      y = 25;
    }

    // Section headings (e.g., "1. Overview", "2. Key Highlights")
    if (/^\d+(\.\d+)*\s+[A-Za-z]/.test(trimmed)) {
      y += 3;
      if (y > 270) {
        doc.addPage();
        y = 25;
      }
      doc.setFont("helvetica", "bold");
      const isSub = /^\d+\.\d+/.test(trimmed);
      doc.setFontSize(isSub ? 11 : 13);
      doc.setTextColor(isSub ? 80 : 25, isSub ? 80 : 25, isSub ? 80 : 25);
      const hLines = doc.splitTextToSize(trimmed, maxWidth);
      doc.text(hLines, margin, y);
      y += hLines.length * 5.5 + 2;
      continue;
    }

    // Bullet points
    if (/^[-•*]\s+/.test(trimmed)) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(45, 45, 45);
      const bulletText = trimmed.replace(/^[-•*]\s+/, "");
      const bLines = doc.splitTextToSize(`•  ${bulletText}`, maxWidth - 4);
      doc.text(bLines, margin + 4, y);
      y += bLines.length * 5 + 1.5;
      continue;
    }

    // Regular paragraph
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(45, 45, 45);
    const pLines = doc.splitTextToSize(trimmed, maxWidth);
    doc.text(pLines, margin, y);
    y += pLines.length * 5 + 2;
  }

  addHeaderAndFooter(doc, displayTitle, "Executive Summary");
  const filename = `PrepMind_${sanitizeFilename(sourceTitle)}_Summary.pdf`;
  doc.save(filename);
}

/**
 * 2. Download Academic Study Notes PDF
 */
export function generateNotesPDF(notesData, sourceTitle = "Knowledge Source") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 22;

  const rawTitle = notesData.title ? notesData.title.replace(/^Notes:\s*/, "") : `Study Notes: ${sourceTitle}`;
  const displayTitle = cleanText(rawTitle);

  // Top Category
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(140, 100, 30);
  doc.text("PREPMIND STUDY NOTES", margin, y);
  y += 7;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  const titleLines = doc.splitTextToSize(displayTitle, maxWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 2;

  // Metadata line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Source Document: ${sourceTitle}   |   Course Study Notes`, margin, y);
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  const cleanedContent = cleanText(notesData.content || "");
  const lines = cleanedContent.split("\n");

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      y += 3;
      continue;
    }

    if (y > 270) {
      doc.addPage();
      y = 25;
    }

    // Numbered sections
    if (/^\d+(\.\d+)*\s+[A-Za-z]/.test(trimmed)) {
      y += 3;
      if (y > 270) {
        doc.addPage();
        y = 25;
      }
      doc.setFont("helvetica", "bold");
      const isSub = /^\d+\.\d+/.test(trimmed);
      doc.setFontSize(isSub ? 11 : 13);
      doc.setTextColor(isSub ? 80 : 25, isSub ? 80 : 25, isSub ? 80 : 25);
      const hLines = doc.splitTextToSize(trimmed, maxWidth);
      doc.text(hLines, margin, y);
      y += hLines.length * 5.5 + 2;
      continue;
    }

    // Bullet points
    if (/^[-•*]\s+/.test(trimmed)) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(45, 45, 45);
      const bulletText = trimmed.replace(/^[-•*]\s+/, "");
      const bLines = doc.splitTextToSize(`•  ${bulletText}`, maxWidth - 4);
      doc.text(bLines, margin + 4, y);
      y += bLines.length * 5 + 1.5;
      continue;
    }

    // Paragraph text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(45, 45, 45);
    const pLines = doc.splitTextToSize(trimmed, maxWidth);
    doc.text(pLines, margin, y);
    y += pLines.length * 5 + 2;
  }

  addHeaderAndFooter(doc, displayTitle, "Study Notes");
  const filename = `PrepMind_${sanitizeFilename(sourceTitle)}_Study_Notes.pdf`;
  doc.save(filename);
}

/**
 * 3. Download Quiz Question Paper PDF (NO answers/explanations)
 */
export function generateQuizQuestionPDF(assessment, sourceTitle = "Knowledge Source") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 22;

  const rawTitle = assessment.title ? assessment.title.replace(/^Quiz:\s*/, "") : `Assessment on ${sourceTitle}`;
  const displayTitle = cleanText(rawTitle);

  // Institution Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text("PREPMIND", pageWidth / 2, y, { align: "center" });
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(140, 100, 30);
  doc.text("QUIZ EXAMINATION PAPER", pageWidth / 2, y, { align: "center" });
  y += 8;

  // Meta box
  doc.setFillColor(248, 247, 243);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(margin, y, maxWidth, 22, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`Title: ${displayTitle.slice(0, 60)}`, margin + 4, y + 6);
  doc.text(`Source: ${sourceTitle.slice(0, 60)}`, margin + 4, y + 11);
  doc.text(`Difficulty: ${assessment.difficulty || "Medium"}   |   Total Questions: ${assessment.questions?.length || 0}`, margin + 4, y + 16);
  y += 28;

  // Instructions
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text("Instructions:", margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  const instructions = [
    "1. Answer all questions carefully.",
    "2. Select the most appropriate option for each question.",
    "3. Do not refer to external resources or answers during the attempt.",
  ];
  for (let inst of instructions) {
    doc.text(inst, margin + 4, y);
    y += 4.5;
  }
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Questions
  const questions = assessment.questions || [];
  questions.forEach((q, idx) => {
    if (y > 250) {
      doc.addPage();
      y = 25;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    const qHeader = `Question ${idx + 1}`;
    doc.text(qHeader, margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const qLines = doc.splitTextToSize(cleanText(q.question), maxWidth);
    doc.text(qLines, margin, y);
    y += qLines.length * 5 + 2;

    const optLabels = ["A", "B", "C", "D", "E"];
    (q.options || []).forEach((opt, oIdx) => {
      if (y > 270) {
        doc.addPage();
        y = 25;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(60, 60, 60);
      const optText = `${optLabels[oIdx]}. ${cleanText(opt)}`;
      const optLines = doc.splitTextToSize(optText, maxWidth - 6);
      doc.text(optLines, margin + 6, y);
      y += optLines.length * 4.8 + 1;
    });

    y += 4;
  });

  addHeaderAndFooter(doc, displayTitle, "Quiz Paper");
  const filename = `PrepMind_${sanitizeFilename(sourceTitle)}_Quiz.pdf`;
  doc.save(filename);
}

/**
 * 4. Download Quiz Result PDF (With student answer, correct answer, score, and explanation)
 */
export function generateQuizResultPDF(assessment, attempt, sourceTitle = "Knowledge Source") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 22;

  const rawTitle = assessment.title ? assessment.title.replace(/^Quiz:\s*/, "") : `Quiz Result: ${sourceTitle}`;
  const displayTitle = cleanText(rawTitle);

  // Institution Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text("PREPMIND", pageWidth / 2, y, { align: "center" });
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(140, 100, 30);
  doc.text("QUIZ EXAMINATION RESULT", pageWidth / 2, y, { align: "center" });
  y += 8;

  // Score Box Calculations
  const questions = assessment.questions || [];
  const answers = attempt.answers || [];
  const totalCount = attempt.totalMarks || questions.length || 1;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const answeredCount = answers.filter((a) => a.userAnswer && String(a.userAnswer).trim() !== "").length;
  const unansweredCount = Math.max(0, totalCount - answeredCount);
  const incorrectCount = Math.max(0, totalCount - correctCount - unansweredCount);
  const percentage = attempt.percentage ?? Math.round((correctCount / totalCount) * 100);
  const genTime = assessment.generationTimeSeconds ? `${assessment.generationTimeSeconds}s` : (attempt.timeSpentSeconds ? `${attempt.timeSpentSeconds}s` : "N/A");

  doc.setFillColor(248, 247, 243);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(margin, y, maxWidth, 32, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`Source: ${sourceTitle.slice(0, 50)}   |   Date: ${new Date().toLocaleDateString()}`, margin + 4, y + 6);
  doc.text(`Difficulty: ${assessment.difficulty || "Medium"}   |   Question Type: ${assessment.questionType || "MCQ"}`, margin + 4, y + 11);
  doc.text(`Total Questions: ${totalCount}   |   Score: ${correctCount}   |   Percentage: ${percentage}%`, margin + 4, y + 16);
  doc.text(`Correct: ${correctCount}   |   Incorrect: ${incorrectCount}   |   Unanswered: ${unansweredCount}`, margin + 4, y + 21);
  doc.text(`Generation Time: ${genTime}`, margin + 4, y + 26);
  y += 38;

  // Questions and Detailed Feedback
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text("Questions & Evaluated Results:", margin, y);
  y += 6;

  questions.forEach((q, idx) => {
    if (y > 230) {
      doc.addPage();
      y = 25;
    }

    const ans = answers.find(
      (a) =>
        (a.questionId != null && String(a.questionId) === String(q.id)) ||
        (q._id && a.questionId != null && String(a.questionId) === String(q._id)) ||
        (a.questionIndex != null && Number(a.questionIndex) === idx) ||
        (a.questionId != null && String(a.questionId) === String(idx)) ||
        (a.question && cleanText(a.question).toLowerCase() === cleanText(q.question).toLowerCase())
    ) || (answers && answers[idx] ? answers[idx] : null);

    let rawUserAns = ans?.userAnswer != null ? String(ans.userAnswer).trim() : "";
    if (rawUserAns === "(None)" || rawUserAns === "None" || rawUserAns === "undefined" || rawUserAns === "null" || rawUserAns === "NaN") {
      rawUserAns = "";
    }
    const isAnswered = Boolean(rawUserAns && rawUserAns !== "Not Answered");
    const isCorrect = Boolean(ans?.isCorrect);

    const statusLabel = isCorrect ? "CORRECT" : (isAnswered ? "INCORRECT" : "NOT ANSWERED");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(`Question ${idx + 1}:`, margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(40, 40, 40);
    const qLines = doc.splitTextToSize(cleanText(q.question), maxWidth);
    doc.text(qLines, margin, y);
    y += qLines.length * 4.8 + 2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    // Your Answer
    if (isCorrect) {
      doc.setTextColor(30, 130, 40);
      doc.text(`Your Answer: ${rawUserAns}`, margin + 4, y);
    } else if (isAnswered) {
      doc.setTextColor(180, 40, 40);
      doc.text(`Your Answer: ${rawUserAns}`, margin + 4, y);
    } else {
      doc.setTextColor(120, 120, 120);
      doc.text(`Your Answer: Not Answered`, margin + 4, y);
    }
    y += 4.5;

    // Correct Answer
    const displayCorrect = q.correctAnswer != null ? String(q.correctAnswer).trim() : "";
    doc.setTextColor(30, 130, 40);
    doc.text(`Correct Answer: ${displayCorrect}`, margin + 4, y);
    y += 4.5;

    // Result
    doc.setFont("helvetica", "bold");
    if (isCorrect) {
      doc.setTextColor(30, 130, 40);
    } else if (isAnswered) {
      doc.setTextColor(180, 40, 40);
    } else {
      doc.setTextColor(180, 120, 30);
    }
    doc.text(`Result: ${statusLabel}`, margin + 4, y);
    y += 4.5;

    // Explanation
    doc.setFont("helvetica", "normal");
    if (q.explanation) {
      doc.setTextColor(100, 100, 100);
      const expLines = doc.splitTextToSize(`Explanation: ${cleanText(q.explanation)}`, maxWidth - 4);
      doc.text(expLines, margin + 4, y);
      y += expLines.length * 4.2 + 2;
    }

    y += 4;
  });

  addHeaderAndFooter(doc, displayTitle, "Quiz Result");
  const filename = `PrepMind_${sanitizeFilename(sourceTitle)}_Quiz_Result.pdf`;
  doc.save(filename);
}

/**
 * 5. Download Practice Paper Question Paper PDF (NO solutions)
 */
export function generatePracticePaperPDF(assessment, sourceTitle = "Knowledge Source") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 22;

  const rawTitle = assessment.title ? assessment.title.replace(/^Practice Paper:\s*/, "") : `Practice Examination`;
  const displayTitle = cleanText(rawTitle);

  // Institution Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(30, 30, 30);
  doc.text("PREPMIND", pageWidth / 2, y, { align: "center" });
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(140, 100, 30);
  doc.text("PRACTICE EXAMINATION", pageWidth / 2, y, { align: "center" });
  y += 8;

  // Exam Meta Box
  doc.setFillColor(248, 247, 243);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(margin, y, maxWidth, 24, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`Subject / Topic: ${displayTitle.slice(0, 55)}`, margin + 4, y + 6);
  doc.text(`Source: ${sourceTitle.slice(0, 55)}`, margin + 4, y + 11);
  doc.text(`Time Allowed: ${assessment.timeAllowedMinutes || 90} Minutes   |   Maximum Marks: ${assessment.totalMarks || 50}`, margin + 4, y + 17);
  y += 30;

  // Instructions
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text("General Instructions:", margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  const instructions = [
    "1. Read each question carefully before attempting.",
    "2. All sections are compulsory unless specified otherwise.",
    "3. Marks allotted to each question are indicated in brackets.",
  ];
  for (let inst of instructions) {
    doc.text(inst, margin + 4, y);
    y += 4.5;
  }
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Sections and Questions (Without solutions)
  (assessment.sections || []).forEach((sec, sIdx) => {
    if (y > 250) {
      doc.addPage();
      y = 25;
    }

    // Section Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(25, 25, 25);
    doc.text(sec.sectionName || `SECTION ${String.fromCharCode(65 + sIdx)}`, margin, y);
    y += 5;

    if (sec.instructions) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const sInstLines = doc.splitTextToSize(sec.instructions, maxWidth);
      doc.text(sInstLines, margin, y);
      y += sInstLines.length * 4.5 + 3;
    }

    (sec.questions || []).forEach((q, qIdx) => {
      if (y > 255) {
        doc.addPage();
        y = 25;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      const marksStr = `[${q.marks || sec.marksPerQuestion || 5} Marks]`;
      doc.text(`Q${qIdx + 1}.`, margin, y);
      doc.text(marksStr, pageWidth - margin, y, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      const qLines = doc.splitTextToSize(cleanText(q.question), maxWidth - 25);
      doc.text(qLines, margin + 8, y);
      y += qLines.length * 5 + 2;

      // Render options if MCQ
      if (q.type === "MCQ" && q.options) {
        const optLabels = ["A", "B", "C", "D", "E"];
        q.options.forEach((opt, oIdx) => {
          if (y > 270) {
            doc.addPage();
            y = 25;
          }
          doc.setFontSize(9);
          doc.setTextColor(70, 70, 70);
          const optLines = doc.splitTextToSize(`${optLabels[oIdx]}. ${cleanText(opt)}`, maxWidth - 16);
          doc.text(optLines, margin + 12, y);
          y += optLines.length * 4.5 + 1;
        });
      }

      y += 4;
    });

    y += 4;
  });

  addHeaderAndFooter(doc, displayTitle, "Practice Examination");
  const filename = `PrepMind_${sanitizeFilename(sourceTitle)}_Practice_Paper.pdf`;
  doc.save(filename);
}

/**
 * 6. Download Practice Paper Solutions PDF
 */
export function generatePracticeSolutionsPDF(assessment, sourceTitle = "Knowledge Source") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 22;

  const rawTitle = assessment.title ? assessment.title.replace(/^Practice Paper:\s*/, "") : `Practice Examination Solutions`;
  const displayTitle = cleanText(rawTitle);

  // Institution Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(30, 30, 30);
  doc.text("PREPMIND", pageWidth / 2, y, { align: "center" });
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(140, 100, 30);
  doc.text("EXAMINATION SOLUTIONS & MARKING SCHEME", pageWidth / 2, y, { align: "center" });
  y += 8;

  // Meta Box
  doc.setFillColor(248, 247, 243);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(margin, y, maxWidth, 20, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`Subject: ${displayTitle.slice(0, 55)}`, margin + 4, y + 6);
  doc.text(`Source: ${sourceTitle.slice(0, 55)}   |   Total Marks: ${assessment.totalMarks || 50}`, margin + 4, y + 12);
  y += 26;

  (assessment.sections || []).forEach((sec, sIdx) => {
    if (y > 250) {
      doc.addPage();
      y = 25;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(25, 25, 25);
    doc.text(sec.sectionName || `SECTION ${String.fromCharCode(65 + sIdx)}`, margin, y);
    y += 6;

    (sec.questions || []).forEach((q, qIdx) => {
      if (y > 245) {
        doc.addPage();
        y = 25;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text(`Q${qIdx + 1}. ${cleanText(q.question)}`, margin, y);
      y += 5;

      const expected = q.expectedAnswer || q.correctAnswer || "Refer to course reference materials.";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 110, 40);
      const expLines = doc.splitTextToSize(`Expected Solution: ${cleanText(expected)}`, maxWidth - 6);
      doc.text(expLines, margin + 6, y);
      y += expLines.length * 4.5 + 2;

      if (q.rubric) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(110, 110, 110);
        const rubLines = doc.splitTextToSize(`Marking Rubric: ${cleanText(q.rubric)}`, maxWidth - 6);
        doc.text(rubLines, margin + 6, y);
        y += rubLines.length * 4 + 2;
      }

      y += 4;
    });

    y += 4;
  });

  addHeaderAndFooter(doc, displayTitle, "Examination Solutions");
  const filename = `PrepMind_${sanitizeFilename(sourceTitle)}_Solutions.pdf`;
  doc.save(filename);
}
