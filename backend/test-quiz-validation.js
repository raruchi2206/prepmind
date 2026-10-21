const assert = require("assert");
const {
  normalizeQuestionCount,
  normalizeQuestionType,
  validateQuizQuestionSet,
} = require("./src/utils/quizValidation");

console.log("Running Quiz Validation Unit Tests...");

// Test 1: Count normalization
assert.strictEqual(normalizeQuestionCount(3), 3);
assert.strictEqual(normalizeQuestionCount(5), 5);
assert.strictEqual(normalizeQuestionCount(8), 8);
assert.strictEqual(normalizeQuestionCount(10), 10);
assert.strictEqual(normalizeQuestionCount("3"), 3);
assert.strictEqual(normalizeQuestionCount("invalid", 5), 5);

// Test 2: Question Type Normalization
assert.strictEqual(normalizeQuestionType("MCQ"), "MCQ");
assert.strictEqual(normalizeQuestionType("True/False"), "True/False");
assert.strictEqual(normalizeQuestionType("Mixed"), "Mixed");

// Test 3: Validate exact question count enforcement for 3, 5, 8, 10
const createSampleMCQ = (num) => ({
  question: `Sample question ${num} based on document?`,
  type: "MCQ",
  options: ["Option Alpha", "Option Beta", "Option Gamma", "Option Delta"],
  correctAnswer: "Option Alpha",
  explanation: `Explanation for question ${num}`,
});

for (const count of [3, 5, 8, 10]) {
  const quizPayload = {
    title: `Assessment for count ${count}`,
    questions: Array.from({ length: count }, (_, i) => createSampleMCQ(i + 1)),
  };

  const validated = validateQuizQuestionSet(quizPayload, {
    questionCount: count,
    questionType: "MCQ",
  });

  assert.strictEqual(validated.questions.length, count, `Expected ${count} questions`);
  console.log(`✓ Count ${count} verified: exactly ${validated.questions.length} questions returned.`);
}

// Test 4: Rejection when count does not match requested
try {
  const mismatchedQuiz = {
    title: "Mismatched",
    questions: Array.from({ length: 3 }, (_, i) => createSampleMCQ(i + 1)),
  };
  validateQuizQuestionSet(mismatchedQuiz, { questionCount: 5 });
  assert.fail("Should have thrown error on count mismatch");
} catch (err) {
  assert(err.message.includes("exactly 5 questions are required"));
  console.log("✓ Count mismatch rejection verified: throws error when AI returns 3 instead of 5.");
}

console.log("\nAll Quiz Validation Tests Passed Successfully!");
