function normalizeQuestionCount(value, fallback = 5) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return Number(fallback) || 5;
  }
  return Math.min(parsed, 20);
}

function normalizeQuestionType(value, fallback = "MCQ") {
  const raw = String(value ?? fallback).trim();
  if (!raw) return fallback;

  const collapsed = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (
    collapsed.includes("true") ||
    collapsed.includes("boolean") ||
    collapsed.includes("truefalse")
  ) {
    return "True/False";
  }
  if (collapsed.includes("mixed")) {
    return "Mixed";
  }
  return "MCQ";
}

function normalizeOptionText(option) {
  const value = String(option ?? "").trim();
  if (!value) return "";

  const m1 = value.match(/^\s*[\(\[]([A-D]|[1-4])[\)\]][\.:-]?\s*(.*)$/i);
  if (m1 && m1[2].trim()) {
    return m1[2].trim();
  }
  const m2 = value.match(/^\s*(?:option|choice)\s*([A-D]|[1-4])?[\.:-]?\s*(.*)$/i);
  if (m2 && m2[2].trim()) {
    return m2[2].trim();
  }
  const m3 = value.match(/^\s*([A-D]|[1-4])[\)\]\.:-]\s*(.*)$/i);
  if (m3 && m3[2].trim()) {
    return m3[2].trim();
  }

  return value;
}

function stripOptionPrefix(value) {
  return normalizeOptionText(value);
}

function optionMatchesAnswer(option, answer) {
  const normalizedOption = normalizeOptionText(option);
  const normalizedAnswer = String(answer ?? "").trim();
  if (!normalizedAnswer) return false;
  const normalizedAnswerText = stripOptionPrefix(normalizedAnswer);

  const answerLetterIndex = normalizedAnswer.match(/^\s*(?:option|choice)?\s*[\(\[]?([A-D]|[1-4])[\)\]\.:]?/i);
  if (answerLetterIndex && (normalizedAnswer.length <= 12 || normalizedAnswer.toLowerCase().startsWith("option") || normalizedAnswer.toLowerCase().startsWith("choice"))) {
    const indexMap = { A: 0, B: 1, C: 2, D: 3, 1: 0, 2: 1, 3: 2, 4: 3 };
    const optionIndex = indexMap[String(answerLetterIndex[1]).toUpperCase()];
    if (typeof optionIndex === "number") {
      return true;
    }
  }

  if (normalizedOption.toLowerCase() === normalizedAnswerText.toLowerCase() ||
      normalizedOption.toLowerCase() === normalizedAnswer.toLowerCase()) {
    return true;
  }

  return false;
}

function normalizeCorrectAnswer(options, answer) {
  const normalizedAnswer = String(answer ?? "").trim();
  if (!Array.isArray(options) || options.length === 0) return "";
  if (!normalizedAnswer) return "";

  // Integer or digit index
  if (/^\d+$/.test(normalizedAnswer)) {
    const num = Number.parseInt(normalizedAnswer, 10);
    if (num >= 0 && num < options.length) {
      return normalizeOptionText(options[num]);
    }
    if (num >= 1 && num <= options.length) {
      return normalizeOptionText(options[num - 1]);
    }
  }

  const letterIndex = normalizedAnswer.match(/^\s*(?:option|choice)?\s*[\(\[]?([A-D]|[1-4])[\)\]\.:]?/i);
  if (letterIndex && (normalizedAnswer.length <= 12 || normalizedAnswer.toLowerCase().startsWith("option") || normalizedAnswer.toLowerCase().startsWith("choice"))) {
    const indexMap = { A: 0, B: 1, C: 2, D: 3, 1: 0, 2: 1, 3: 2, 4: 3 };
    const optionIndex = indexMap[String(letterIndex[1]).toUpperCase()];
    if (
      typeof optionIndex === "number" &&
      options[optionIndex]
    ) {
      return normalizeOptionText(options[optionIndex]);
    }
  }

  const directMatch = options.find((option) =>
    normalizeOptionText(option).toLowerCase() === stripOptionPrefix(normalizedAnswer).toLowerCase() ||
    normalizeOptionText(option).toLowerCase() === normalizedAnswer.toLowerCase()
  );
  if (directMatch) {
    return normalizeOptionText(directMatch);
  }

  const subMatch = options.find((option) => {
    const optText = normalizeOptionText(option).toLowerCase();
    const ansText = stripOptionPrefix(normalizedAnswer).toLowerCase();
    return ansText && (optText.includes(ansText) || ansText.includes(optText));
  });
  if (subMatch) {
    return normalizeOptionText(subMatch);
  }

  return "";
}

function normalizeTextForComparison(value = "") {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripFillerPrefixes(value = "") {
  let s = normalizeTextForComparison(value);
  const fillers = [
    /^can you (?:please )?(?:explain|describe|tell me|state)\s+/,
    /^(?:please )?(?:explain|describe|state|define)\s+/,
    /^what is meant by\s+/,
    /^according to the (?:text|passage|document|context)\s*,?\s*/,
    /^based on the (?:text|passage|document|context)\s*,?\s*/,
  ];
  for (const pattern of fillers) {
    s = s.replace(pattern, "").trim();
  }
  return s;
}

function questionLooksSimilar(left, right) {
  const a = normalizeTextForComparison(left);
  const b = normalizeTextForComparison(right);
  if (!a || !b) return false;
  if (a === b) return true;

  const aClean = stripFillerPrefixes(left);
  const bClean = stripFillerPrefixes(right);
  if (aClean && bClean) {
    if (aClean === bClean) return true;
    const aWords = aClean.split(" ").filter(Boolean);
    const bWords = bClean.split(" ").filter(Boolean);
    const aSet = new Set(aWords);
    const bSet = new Set(bWords);
    if (
      aSet.size === bSet.size &&
      [...aSet].every((w) => bSet.has(w)) &&
      Math.abs(aWords.length - bWords.length) <= 1
    ) {
      return true;
    }
  }

  return false;
}

function validateQuizQuestionSet(quiz, request = {}) {
  const expectedCount = normalizeQuestionCount(request.questionCount, 5);
  const requestedType = normalizeQuestionType(request.questionType, "MCQ");

  if (!quiz || typeof quiz !== "object" || !Array.isArray(quiz.questions)) {
    throw new Error(
      `Quiz generation failed: returned malformed output. Exactly ${expectedCount} questions are required.`,
    );
  }

  const validQuestions = [];
  const seenQuestions = [];

  for (
    let questionIndex = 0;
    questionIndex < quiz.questions.length;
    questionIndex += 1
  ) {
    const rawQuestion = quiz.questions[questionIndex];
    const displayIndex = questionIndex + 1;
    if (!rawQuestion || typeof rawQuestion !== "object") {
      throw new Error(`Question ${displayIndex} is malformed.`);
    }

    const questionText = String(
      rawQuestion.question ||
      rawQuestion.prompt ||
      rawQuestion.questionText ||
      rawQuestion.statement ||
      rawQuestion.title ||
      ""
    ).trim();
    if (!questionText) {
      throw new Error(`Question ${displayIndex} is missing question text.`);
    }

    const isDuplicate = seenQuestions.some((seen) =>
      questionLooksSimilar(seen, questionText),
    );
    if (isDuplicate) {
      continue;
    }

    const questionType = normalizeQuestionType(
      rawQuestion.type || requestedType,
      requestedType,
    );
    let options = Array.isArray(rawQuestion.options)
      ? rawQuestion.options
          .map((option) => normalizeOptionText(typeof option === "object" ? option.text || option.value || option : option))
          .filter(Boolean)
      : [];
    const rawCorrect = String(
      rawQuestion.correctAnswer ?? rawQuestion.correct_answer ?? rawQuestion.answer ?? rawQuestion.solution ?? rawQuestion.correctOption ?? rawQuestion.correctChoice ?? "",
    ).trim();
    let explanation = String(
      rawQuestion.explanation ?? rawQuestion.reason ?? rawQuestion.solution ?? rawQuestion.rationale ?? rawQuestion.details ?? rawQuestion.answerExplanation ?? "",
    ).trim();

    if (!explanation) {
      explanation = "Based on the provided study material.";
    }

    if (requestedType === "True/False" || questionType === "True/False" || questionType === "TRUE_FALSE") {
      const lower = rawCorrect.toLowerCase();
      let normalizedCorrectAnswer = "";
      if (lower === "false" || lower === "f" || lower === "no" || lower === "0") {
        normalizedCorrectAnswer = "False";
      } else if (lower === "true" || lower === "t" || lower === "yes" || lower === "1") {
        normalizedCorrectAnswer = "True";
      } else {
        normalizedCorrectAnswer = "True";
      }
      options = ["True", "False"];
      validQuestions.push({
        ...rawQuestion,
        question: questionText,
        type: "True/False",
        options,
        correctAnswer: normalizedCorrectAnswer,
        explanation,
      });
      seenQuestions.push(questionText);
      continue;
    }

    // MCQ or Mixed
    // Ensure distinct options
    const uniqueOptions = [];
    for (const opt of options) {
      if (opt && !uniqueOptions.includes(opt)) {
        uniqueOptions.push(opt);
      }
    }
    const fallbackChoices = ["None of the above", "All of the above", "Cannot be determined", "Both A and B"];
    for (const fb of fallbackChoices) {
      if (uniqueOptions.length >= 4) break;
      if (!uniqueOptions.includes(fb)) {
        uniqueOptions.push(fb);
      }
    }
    options = uniqueOptions.slice(0, 4);

    let normalizedCorrectAnswer = normalizeCorrectAnswer(
      options,
      rawCorrect,
    );

    if (!normalizedCorrectAnswer && options.length > 0) {
      normalizedCorrectAnswer = options[0];
    }

    validQuestions.push({
      ...rawQuestion,
      question: questionText,
      type: "MCQ",
      options,
      correctAnswer: normalizedCorrectAnswer,
      explanation,
    });
    seenQuestions.push(questionText);
  }

  if (validQuestions.length < expectedCount) {
    throw new Error(
      `Quiz generation failed: returned ${validQuestions.length} valid questions, but exactly ${expectedCount} questions are required.`,
    );
  }

  return {
    ...quiz,
    title: String(quiz.title || "Quiz").trim() || "Quiz",
    questions: validQuestions.map((question, index) => ({
      ...question,
      questionNumber: index + 1,
    })),
  };
}

module.exports = {
  normalizeQuestionCount,
  normalizeQuestionType,
  questionLooksSimilar,
  validateQuizQuestionSet,
};
