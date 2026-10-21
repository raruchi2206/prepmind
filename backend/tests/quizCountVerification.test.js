const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const { generateQuiz } = require("../src/services/ragService.js");
const User = require("../src/models/User.js");
const KnowledgeSource = require("../src/models/KnowledgeSource.js");
const KnowledgeChunk = require("../src/models/KnowledgeChunk.js");
const Assessment = require("../src/models/Assessment.js");
const GeneratedContent = require("../src/models/GeneratedContent.js");
const aiServiceClient = require("../src/services/aiServiceClient.js");
const { env } = require("../src/config/env.js");

const MONGO_URI = process.env.MONGODB_URI || env.MONGODB_URI || env.MONGO_URI;

describe("PrepMind Quiz Generation Count Verification (3, 5, 8, 10)", () => {
  let testUser;
  let testSource;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    testUser = await User.create({
      name: "Quiz Count Test User",
      email: `quiz_count_test_${Date.now()}@example.com`,
      username: `quiz_user_${Date.now()}`,
      passwordHash: "argon2id$v=19$m=65536,t=3,p=4$dummyhash",
      role: "USER",
      isEmailVerified: true,
    });

    testSource = await KnowledgeSource.create({
      userId: testUser._id,
      title: "Quantum Physics & Wave Mechanics",
      type: "PDF",
      originalFileName: "Quantum_Physics_Notes.pdf",
      fileType: "pdf",
      fileSize: 4096,
      status: "READY",
      chunkCount: 3,
      metadata: { pageCount: 2, characterCount: 1500, wordCount: 250 },
    });

    const sampleChunks = [
      {
        userId: testUser._id,
        knowledgeSourceId: testSource._id,
        chunkIndex: 0,
        text: "Quantum mechanics is a fundamental theory in physics that provides a description of the physical properties of nature at the scale of atoms and subatomic particles. Max Planck proposed in 1900 that energy is emitted in discrete units called quanta.",
        metadata: { page: 1, section: "Introduction", sourceType: "PDF" },
      },
      {
        userId: testUser._id,
        knowledgeSourceId: testSource._id,
        chunkIndex: 1,
        text: "Wave-particle duality is the concept in quantum mechanics that every particle or quantum entity may be described as either a particle or a wave. Louis de Broglie hypothesized that all matter exhibits wave-like properties with a wavelength equal to Planck's constant divided by momentum.",
        metadata: { page: 1, section: "Wave-Particle Duality", sourceType: "PDF" },
      },
      {
        userId: testUser._id,
        knowledgeSourceId: testSource._id,
        chunkIndex: 2,
        text: "The Heisenberg uncertainty principle states that there is a fundamental limit to the precision with which certain pairs of physical properties of a particle, such as position x and momentum p, can be known simultaneously: Delta x times Delta p is greater than or equal to h-bar over 2.",
        metadata: { page: 2, section: "Uncertainty Principle", sourceType: "PDF" },
      },
    ];

    const insertedChunks = await KnowledgeChunk.insertMany(sampleChunks);

    // Index into FAISS via aiServiceClient
    try {
      await aiServiceClient.indexChunks(testUser._id, testSource._id, insertedChunks);
    } catch (e) {
      console.warn("Auto-index warning (if AI service not yet running):", e.message);
    }
  });

  after(async () => {
    if (testUser) {
      await User.deleteMany({ _id: testUser._id });
      await KnowledgeSource.deleteMany({ userId: testUser._id });
      await KnowledgeChunk.deleteMany({ userId: testUser._id });
      await Assessment.deleteMany({ userId: testUser._id });
      await GeneratedContent.deleteMany({ userId: testUser._id });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it("Test 1: Generates exactly 3 valid MCQ questions", async () => {
    console.log("\n--- START TEST: 3 QUESTIONS ---");
    const result = await generateQuiz({
      userId: testUser._id,
      knowledgeSourceIds: [testSource._id],
      questionCount: 3,
      difficulty: "Medium",
      questionType: "MCQ",
    });

    assert.strictEqual(result.questions.length, 3, "Must generate exactly 3 questions");
    for (const q of result.questions) {
      assert.ok(q.question && q.question.length > 5, "Question text must exist");
      assert.strictEqual(q.options.length, 4, "Must have exactly 4 options");
      assert.ok(q.options.includes(q.correctAnswer), "correctAnswer must be one of the options");
      assert.ok(q.explanation && q.explanation.length > 5, "Explanation must exist");
    }
    console.log("--- RESULT 3 QUESTIONS: PASS ---");
  });

  it("Test 2: Generates exactly 5 valid MCQ questions", async () => {
    console.log("\n--- START TEST: 5 QUESTIONS ---");
    const result = await generateQuiz({
      userId: testUser._id,
      knowledgeSourceIds: [testSource._id],
      questionCount: 5,
      difficulty: "Medium",
      questionType: "MCQ",
    });

    assert.strictEqual(result.questions.length, 5, "Must generate exactly 5 questions");
    for (const q of result.questions) {
      assert.ok(q.question && q.question.length > 5, "Question text must exist");
      assert.strictEqual(q.options.length, 4, "Must have exactly 4 options");
      assert.ok(q.options.includes(q.correctAnswer), "correctAnswer must be one of the options");
      assert.ok(q.explanation && q.explanation.length > 5, "Explanation must exist");
    }
    console.log("--- RESULT 5 QUESTIONS: PASS ---");
  });

  it("Test 3: Generates exactly 8 valid MCQ questions", async () => {
    console.log("\n--- START TEST: 8 QUESTIONS ---");
    const result = await generateQuiz({
      userId: testUser._id,
      knowledgeSourceIds: [testSource._id],
      questionCount: 8,
      difficulty: "Medium",
      questionType: "MCQ",
    });

    assert.strictEqual(result.questions.length, 8, "Must generate exactly 8 questions");
    for (const q of result.questions) {
      assert.ok(q.question && q.question.length > 5, "Question text must exist");
      assert.strictEqual(q.options.length, 4, "Must have exactly 4 options");
      assert.ok(q.options.includes(q.correctAnswer), "correctAnswer must be one of the options");
      assert.ok(q.explanation && q.explanation.length > 5, "Explanation must exist");
    }
    console.log("--- RESULT 8 QUESTIONS: PASS ---");
  });

  it("Test 4: Generates exactly 10 valid MCQ questions", async () => {
    console.log("\n--- START TEST: 10 QUESTIONS ---");
    const result = await generateQuiz({
      userId: testUser._id,
      knowledgeSourceIds: [testSource._id],
      questionCount: 10,
      difficulty: "Medium",
      questionType: "MCQ",
    });

    assert.strictEqual(result.questions.length, 10, "Must generate exactly 10 questions");
    for (const q of result.questions) {
      assert.ok(q.question && q.question.length > 5, "Question text must exist");
      assert.strictEqual(q.options.length, 4, "Must have exactly 4 options");
      assert.ok(q.options.includes(q.correctAnswer), "correctAnswer must be one of the options");
      assert.ok(q.explanation && q.explanation.length > 5, "Explanation must exist");
    }
    console.log("--- RESULT 10 QUESTIONS: PASS ---");
  });
});
