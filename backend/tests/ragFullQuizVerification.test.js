const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { validateQuizQuestionSet, normalizeQuestionCount } = require("../src/utils/quizValidation");

describe("PrepMind Quiz Count & Structure End-to-End Verification", () => {
  const generateMockBatch = (startIdx, count, difficulty = "Medium") => {
    const questions = [];
    for (let i = 0; i < count; i++) {
      const num = startIdx + i;
      questions.push({
        question: `Question ${num}: What is the primary function of computer component #${num}?`,
        options: [
          `Option A for component #${num}`,
          `Option B for component #${num}`,
          `Option C for component #${num}`,
          `Option D for component #${num}`,
        ],
        correctAnswer: `Option A for component #${num}`,
        explanation: `Component #${num} operates using Option A as verified in chapter ${num}.`,
      });
    }
    return questions;
  };

  it("Test: Requested 3 questions -> returns exactly 3", () => {
    const questions = generateMockBatch(1, 3);
    const quizPayload = {
      title: "Computer Architecture Quiz",
      difficulty: "Easy",
      questions,
    };
    const validated = validateQuizQuestionSet(quizPayload, { questionCount: 3, questionType: "MCQ" });
    assert.equal(validated.questions.length, 3);
    console.log("[QUIZ TEST]\nRequested: 3\nGenerated: 3\nStatus: PASS");
  });

  it("Test: Requested 5 questions -> returns exactly 5", () => {
    const questions = generateMockBatch(1, 5);
    const quizPayload = {
      title: "Operating Systems Quiz",
      difficulty: "Medium",
      questions,
    };
    const validated = validateQuizQuestionSet(quizPayload, { questionCount: 5, questionType: "MCQ" });
    assert.equal(validated.questions.length, 5);
    console.log("[QUIZ TEST]\nRequested: 5\nGenerated: 5\nStatus: PASS");
  });

  it("Test: Requested 8 questions (Batches 5 + 3) -> returns exactly 8", () => {
    const batch1 = generateMockBatch(1, 5);
    const batch2 = generateMockBatch(6, 3);
    const allQuestions = [...batch1, ...batch2];
    const quizPayload = {
      title: "Network Protocols Quiz",
      difficulty: "Hard",
      questions: allQuestions,
    };
    const validated = validateQuizQuestionSet(quizPayload, { questionCount: 8, questionType: "MCQ" });
    assert.equal(validated.questions.length, 8);
    console.log("[QUIZ TEST]\nRequested: 8\nGenerated: 8\nStatus: PASS");
  });

  it("Test: Requested 10 questions (Batches 5 + 5) -> returns exactly 10", () => {
    const batch1 = generateMockBatch(1, 5);
    const batch2 = generateMockBatch(6, 5);
    const allQuestions = [...batch1, ...batch2];
    const quizPayload = {
      title: "Database Systems Quiz",
      difficulty: "Hard",
      questions: allQuestions,
    };
    const validated = validateQuizQuestionSet(quizPayload, { questionCount: 10, questionType: "MCQ" });
    assert.equal(validated.questions.length, 10);
    console.log("[QUIZ TEST]\nRequested: 10\nGenerated: 10\nStatus: PASS");
  });
});
