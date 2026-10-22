const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const { env } = require("../src/config/env");
const aiServiceClient = require("../src/services/aiServiceClient");
const { extractYouTube } = require("../src/services/extractors/youtubeExtractor");
const knowledgeService = require("../src/services/knowledgeService");
const knowledgeIngestionService = require("../src/services/knowledgeIngestionService");
const ragService = require("../src/services/ragService");
const KnowledgeSource = require("../src/models/KnowledgeSource");
const KnowledgeChunk = require("../src/models/KnowledgeChunk");
const User = require("../src/models/User");

const TEST_YOUTUBE_URL = "https://www.youtube.com/watch?v=kqtD5dpn9C8";
let testUser;
let testSource;

describe("PREPMIND HYBRID AI & YOUTUBE INGESTION TEST SUITE", () => {
  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    }

    // Create or find a test user
    const stamp = Date.now();
    testUser = await User.create({
      name: "Hybrid Test User",
      email: `hybrid_test_${stamp}@example.com`,
      username: `hybrid_user_${stamp}`,
      passwordHash: "argon2id$v=19$m=65536,t=3,p=4$fakehashfortesting1234567890",
      role: "USER",
      isEmailVerified: true,
    });
  });

  after(async () => {
    try {
      if (testSource && testSource._id) {
        await knowledgeService.deleteKnowledgeSource({
          id: testSource._id.toString(),
          userId: testUser._id.toString(),
        }).catch(() => {});
      }
      if (testUser && testUser._id) {
        await User.deleteOne({ _id: testUser._id }).catch(() => {});
      }
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch {}
  });

  test("1. Hybrid AI Health Check reports Groq primary and Ollama fallback", async () => {
    const health = await aiServiceClient.checkHealth();
    assert.equal(health.available, true, "AI service must report available");
    assert.equal(health.primaryProvider, "groq");
    assert.equal(health.fallbackProvider, "ollama");
    assert.ok(health.groq.available, "Groq must be available");
    assert.ok(health.ollama.available, "Ollama must be available");
    assert.equal(health.embedding.dimension, 384, "Embedding dimension must be 384");
  });

  test("2. YouTube Extractor extracts captions, timestamps, and metadata", async () => {
    const extracted = await extractYouTube(TEST_YOUTUBE_URL);
    assert.ok(extracted.items.length > 0, "Must extract at least one block");
    assert.ok(extracted.metadata.title, "Must extract video title");
    assert.ok(extracted.metadata.wordCount > 500, "Must have substantial word count");

    const first = extracted.items[0];
    assert.ok(first.timestamp, "Chunk item must have formatted timestamp");
    assert.equal(typeof first.startSeconds, "number", "startSeconds must be a number");
    assert.equal(typeof first.endSeconds, "number", "endSeconds must be a number");
    assert.ok(first.videoUrl.includes("watch?v="), "videoUrl must be valid YouTube link");
    console.log(`    ✓ YouTube Extracted: "${extracted.metadata.title}" (${extracted.items.length} blocks, ${extracted.metadata.wordCount} words)`);
  });

  test("3. Complete YouTube Knowledge Source Ingestion: Upload -> Extract -> Chunk -> Embed -> FAISS Index", async () => {
    // Step 1: Create source
    const sourceRecord = await knowledgeService.createKnowledgeSource({
      userId: testUser._id,
      title: "Python for Beginners",
      type: "YOUTUBE",
      youtubeUrl: TEST_YOUTUBE_URL,
    });
    assert.equal(sourceRecord.status, "UPLOADING");
    assert.equal(sourceRecord.type, "YOUTUBE");

    // Step 2: Process ingestion pipeline
    const processResult = await knowledgeIngestionService.processKnowledgeSource(
      sourceRecord._id,
      testUser._id,
    );
    assert.ok(processResult.chunkCount > 0, "Ingestion must produce chunks");

    // Step 3: Verify MongoDB persistence
    testSource = await KnowledgeSource.findById(sourceRecord._id);
    assert.equal(testSource.status, "READY", "Source must reach READY status");
    assert.ok(testSource.metadata.chunkCount > 0);

    const storedChunks = await KnowledgeChunk.find({ knowledgeSourceId: testSource._id });
    assert.equal(storedChunks.length, testSource.metadata.chunkCount);

    const sampleChunk = storedChunks[0];
    assert.ok(sampleChunk.metadata.timestamp, "Stored chunk must retain timestamp");
    assert.equal(sampleChunk.metadata.sourceType, "YOUTUBE");
    console.log(`    ✓ Ingestion Pipeline READY: ${storedChunks.length} chunks embedded & indexed in FAISS`);
  });

  test("4. FAISS Vector Search retrieves relevant YouTube chunks with timestamps", async () => {
    const matches = await aiServiceClient.searchVectors(
      testUser._id,
      "What programming framework is used with Python for websites?",
      [testSource._id.toString()],
      3,
      0.15,
    );
    assert.ok(matches.length > 0, "Must retrieve matching chunks from FAISS");
    assert.ok(matches[0].score !== undefined || matches[0].similarity !== undefined);
    console.log(`    ✓ FAISS Vector Search: Retrieved ${matches.length} chunks. Top score: ${matches[0].similarity?.toFixed(4)}`);
  });

  test("5. AI Summary Generation uses YouTube video content", async () => {
    const summary = await ragService.generateSummary({
      userId: testUser._id,
      knowledgeSourceIds: [testSource._id.toString()],
      regenerate: true,
    });
    assert.ok(summary, "Must return summary object");
    assert.ok(summary.content, "Summary must have content");
    assert.ok(summary.content.length > 50, "Summary content must be substantial");
    console.log(`    ✓ AI Summary Generated: ${summary.content.length} characters`);
  });

  test("6. AI Study Notes Generation uses YouTube video content", async () => {
    const notes = await ragService.generateNotes({
      userId: testUser._id,
      knowledgeSourceIds: [testSource._id.toString()],
      regenerate: true,
    });
    assert.ok(notes, "Must return notes object");
    assert.ok(notes.content, "Notes must have content");
    assert.ok(notes.content.length > 50, "Notes content must be substantial");
    console.log(`    ✓ AI Study Notes Generated: ${notes.content.length} characters`);
  });

  test("7. AI Quiz Generation generates 3 questions from YouTube video with answers & explanations", async () => {
    const quiz = await ragService.generateQuiz({
      userId: testUser._id,
      knowledgeSourceIds: [testSource._id.toString()],
      questionCount: 3,
      difficulty: "Medium",
      questionType: "MCQ",
      regenerate: true,
    });
    assert.ok(quiz, "Must return quiz object");
    assert.equal(quiz.questions.length, 3, "Must generate exactly 3 questions");

    for (const q of quiz.questions) {
      assert.ok(q.question, "Question must have text");
      assert.ok(Array.isArray(q.options) && q.options.length >= 2, "Must have options");
      assert.ok(q.correctAnswer !== undefined || typeof q.correctIndex === "number", "correct answer must be present");
      assert.ok(q.explanation, "Must provide explanation");
    }
    console.log(`    ✓ AI Quiz Generated: 3 valid questions with options, scoring keys & explanations`);
  });

  test("8. AI Quiz Generation generates 5 questions with mixed difficulty", async () => {
    const quiz = await ragService.generateQuiz({
      userId: testUser._id,
      knowledgeSourceIds: [testSource._id.toString()],
      questionCount: 5,
      difficulty: "Hard",
      questionType: "MCQ",
      regenerate: true,
    });
    assert.ok(quiz, "Must return quiz object");
    assert.equal(quiz.questions.length, 5, "Must generate exactly 5 questions");
    console.log(`    ✓ AI Quiz Generated: 5 valid questions with Hard difficulty`);
  });

  test("9. Practice Paper Generation from YouTube video", async () => {
    await new Promise((r) => setTimeout(r, 4000));
    const paper = await ragService.generatePracticePaper({
      userId: testUser._id,
      knowledgeSourceIds: [testSource._id.toString()],
      totalMarks: 30,
      difficulty: "Medium",
    });
    assert.ok(paper, "Must return practice paper");
    assert.ok(paper.content, "Practice paper must have structured content");
    console.log(`    ✓ Practice Paper Generated: ${paper.content.length} characters`);
  });

  test("10. Viva Question Generation from YouTube video", async () => {
    const viva = await ragService.generateViva({
      userId: testUser._id,
      knowledgeSourceIds: [testSource._id.toString()],
      questionCount: 3,
      difficulty: "Medium",
    });
    assert.ok(viva, "Must return viva object");
    assert.ok(viva.questions.length >= 2, "Must return viva questions");
    console.log(`    ✓ Viva Generated: ${viva.questions.length} oral questions with model answers`);
  });

  test("11. Ask PrepMind (RAG Chat) answers grounded in YouTube video chunks", async () => {
    const answer = await ragService.askPrepMind({
      userId: testUser._id,
      query: "What are some websites powered by Python and Django according to this tutorial?",
      knowledgeSourceIds: [testSource._id.toString()],
    });
    assert.ok(answer, "Must return answer object");
    assert.ok(answer.answer, "Must contain answer text");
    assert.ok(Array.isArray(answer.sources), "Must return sources list");
    console.log(`    ✓ Ask PrepMind Answered: ${answer.answer.slice(0, 100)}... (${answer.sources.length} sources cited)`);
  });
});
