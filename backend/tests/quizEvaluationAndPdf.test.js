const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Assessment = require("../src/models/Assessment");
const Attempt = require("../src/models/Attempt");
const User = require("../src/models/User");
const KnowledgeSource = require("../src/models/KnowledgeSource");
const { submitAssessmentAttempt } = require("../src/services/ragService");

describe("PrepMind Quiz Evaluation, Answer Selection & PDF Data Integrity Test", () => {
  let mongoServer;
  let testUser;
  let testKnowledge;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    testUser = await User.create({
      name: "Quiz Tester",
      email: "quiz_eval_test@example.com",
      username: "quiz_eval_user",
      passwordHash: "dummyhash12345",
      isEmailVerified: true,
    });

    testKnowledge = await KnowledgeSource.create({
      userId: testUser._id,
      title: "Computer Networks & Operating Systems",
      type: "PDF",
      status: "READY",
    });
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  it("Test: Evaluates user answers accurately and preserves selected answers without losing them", async () => {
    // 1. Create Assessment with 5 questions
    const assessment = await Assessment.create({
      userId: testUser._id,
      knowledgeSourceIds: [testKnowledge._id],
      title: "Quiz: Computer Networks",
      type: "QUIZ",
      difficulty: "Medium",
      questionType: "MCQ",
      totalMarks: 5,
      timeAllowedMinutes: 10,
      questions: [
        {
          question: "Which layer of the OSI model does IP operate at?",
          options: ["Physical", "Data Link", "Network", "Transport"],
          correctAnswer: "Network",
          explanation: "The Internet Protocol operates at Layer 3 (Network).",
        },
        {
          question: "What does DNS stand for?",
          options: ["Domain Name System", "Data Network Service", "Dynamic Node Server", "Digital Name Schema"],
          correctAnswer: "Domain Name System",
          explanation: "DNS stands for Domain Name System.",
        },
        {
          question: "Which transport protocol provides reliable data transmission?",
          options: ["UDP", "TCP", "ICMP", "ARP"],
          correctAnswer: "TCP",
          explanation: "TCP provides connection-oriented reliable transmission.",
        },
        {
          question: "What is the default port for HTTPS?",
          options: ["80", "22", "443", "8080"],
          correctAnswer: "443",
          explanation: "Port 443 is the standard port for HTTPS.",
        },
        {
          question: "Which device operates at Layer 2?",
          options: ["Hub", "Switch", "Router", "Gateway"],
          correctAnswer: "Switch",
          explanation: "Switches operate at Layer 2 based on MAC addresses.",
        },
      ],
    });

    const safeAssessment = assessment.toSafeObject();
    assert.equal(safeAssessment.questions.length, 5);

    // 2. Simulate User selecting answers:
    // Q0: "Network" (Correct)
    // Q1: "Data Network Service" (Incorrect)
    // Q2: "TCP" (Correct)
    // Q3: "443" (Correct)
    // Q4: "" (Unanswered)
    const userAnswers = [
      { questionId: safeAssessment.questions[0].id, userAnswer: "Network" },
      { questionId: safeAssessment.questions[1].id, userAnswer: "Data Network Service" },
      { questionId: safeAssessment.questions[2].id, userAnswer: "TCP" },
      { questionId: safeAssessment.questions[3].id, userAnswer: "443" },
      { questionId: safeAssessment.questions[4].id, userAnswer: "" },
    ];

    const result = await submitAssessmentAttempt({
      userId: testUser._id.toString(),
      assessmentId: safeAssessment.id,
      answers: userAnswers,
      timeSpentSeconds: 120,
    });

    // 3. Verify Score and Grading
    assert.equal(result.totalMarks, 5);
    assert.equal(result.score, 3); // 3 correct out of 5
    assert.equal(result.percentage, 60);

    // 4. Verify each graded answer contains the user's selected answer and never loses it
    assert.equal(result.answers.length, 5);

    // Q0
    assert.equal(result.answers[0].userAnswer, "Network");
    assert.equal(result.answers[0].isCorrect, true);

    // Q1
    assert.equal(result.answers[1].userAnswer, "Data Network Service");
    assert.equal(result.answers[1].isCorrect, false);

    // Q2
    assert.equal(result.answers[2].userAnswer, "TCP");
    assert.equal(result.answers[2].isCorrect, true);

    // Q3
    assert.equal(result.answers[3].userAnswer, "443");
    assert.equal(result.answers[3].isCorrect, true);

    // Q4 (Unanswered)
    assert.equal(result.answers[4].userAnswer, "");
    assert.equal(result.answers[4].isCorrect, false);

    // 5. Verify PDF data preparation
    for (const ans of result.answers) {
      assert.notEqual(ans.userAnswer, undefined);
      assert.notEqual(ans.userAnswer, null);
      assert.notEqual(ans.userAnswer, "(None)");
      assert.notEqual(ans.correctAnswer, undefined);
      assert.notEqual(ans.correctAnswer, null);
    }

    console.log("[TEST RESULT] Score: 3/5 (60%) | Correct: 3 | Incorrect: 1 | Unanswered: 1");
    console.log("[TEST RESULT] All user answers preserved accurately in result object. PASS.");
  });
});
