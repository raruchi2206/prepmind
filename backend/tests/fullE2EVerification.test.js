const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const mongoose = require("mongoose");
const fs = require("node:fs");
const path = require("node:path");

const app = require("../src/app");
const { env } = require("../src/config/env");
const User = require("../src/models/User");
const KnowledgeSource = require("../src/models/KnowledgeSource");
const KnowledgeChunk = require("../src/models/KnowledgeChunk");
const Assessment = require("../src/models/Assessment");
const Attempt = require("../src/models/Attempt");
const GeneratedContent = require("../src/models/GeneratedContent");
const Conversation = require("../src/models/Conversation");
const { createAccessToken } = require("../src/services/tokenService");
const { validateQuizQuestionSet } = require("../src/utils/quizValidation");

let server;
let baseUrl;
let token;
let user;
let sourceDoc;

async function apiRequest(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["Cookie"] = `pm_access_token=${token}`;
  }

  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body:
      options.body instanceof FormData
        ? options.body
        : options.body
        ? JSON.stringify(options.body)
        : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}

  return {
    status: res.status,
    headers: res.headers,
    body: json,
    rawText: text,
  };
}

describe("PREPMIND Comprehensive End-to-End Verification Suite", { timeout: 600000 }, () => {
  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    const testEmail = "comprehensive_e2e_user@example.com";
    await User.deleteMany({ email: testEmail });

    user = await User.create({
      name: "E2E Master Tester",
      username: "e2e_tester_" + Date.now(),
      email: testEmail,
      passwordHash: "$2b$10$FakeHashForTestingOnly1234567890123456789012",
      role: "USER",
      tokenVersion: 0,
      isEmailVerified: true,
    });

    token = createAccessToken(user);
  });

  after(async () => {
    if (user) {
      const userSources = await KnowledgeSource.find({ userId: user._id });
      const sourceIds = userSources.map((s) => s._id);
      await Promise.all([
        KnowledgeChunk.deleteMany({ userId: user._id }),
        KnowledgeSource.deleteMany({ userId: user._id }),
        Assessment.deleteMany({ userId: user._id }),
        Attempt.deleteMany({ userId: user._id }),
        GeneratedContent.deleteMany({ userId: user._id }),
        Conversation.deleteMany({ userId: user._id }),
        User.deleteMany({ _id: user._id }),
      ]);
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("STAGE 1: Ingest & Index Document (PDF/Text) into FAISS & MongoDB", async () => {
    const testDir = path.join(__dirname, "../storage/test_docs");
    fs.mkdirSync(testDir, { recursive: true });
    const txtPath = path.join(testDir, "e2e_study_guide.txt");
    const content = `Distributed Systems & Cloud Computing Overview:
1. CAP Theorem states that any distributed data store can only provide at most two out of three guarantees: Consistency, Availability, and Partition Tolerance.
2. Consistency means every read receives the most recent write or an error.
3. Availability means every non-failing node returns a response for all read and write requests.
4. Partition tolerance means the system continues to operate despite an arbitrary number of messages being dropped or delayed by the network between nodes.
5. Microservices architecture structures an application as a collection of loosely coupled, independently deployable services.
6. Containerization using Docker bundles application code together with related configuration files, libraries, and dependencies.
7. Kubernetes provides automated container deployment, scaling, load balancing, and self-healing mechanisms.
8. Raft Consensus Algorithm is designed to be understandable and manages a replicated log through leader election, log replication, and safety constraints.
9. Database Sharding is a horizontal partitioning method that separates very large databases the into smaller, faster, more easily managed parts called data shards.
10. Event-Driven Architecture uses events to trigger and communicate between decoupled services and is common in modern applications built with microservices.`;

    fs.writeFileSync(txtPath, content, "utf8");

    const formData = new FormData();
    const fileBytes = fs.readFileSync(txtPath);
    formData.append("file", new Blob([fileBytes], { type: "text/plain" }), "e2e_study_guide.txt");
    formData.append("title", "Distributed Systems & Cloud Guide");

    const uploadRes = await apiRequest("/api/knowledge/upload", {
      method: "POST",
      body: formData,
    });

    assert.equal(uploadRes.status, 201);
    assert.equal(uploadRes.body.success, true);
    sourceDoc = uploadRes.body.data.knowledgeSource;
    assert.ok(sourceDoc.id);

    const processRes = await apiRequest(`/api/knowledge/${sourceDoc.id}/process`, {
      method: "POST",
    });

    assert.equal(processRes.status, 200);
    assert.equal(processRes.body.success, true);
    assert.equal(processRes.body.data.status, "READY");

    const chunks = await KnowledgeChunk.find({ knowledgeSourceId: sourceDoc.id });
    assert.ok(chunks.length > 0, "Chunks must be stored in MongoDB");
    console.log(`✓ Document ingested, chunked (${chunks.length} chunks) & indexed in FAISS.`);
  });

  test("STAGE 2: Ask PrepMind Q&A with Context Citations", async () => {
    const res = await apiRequest("/api/rag/ask", {
      method: "POST",
      body: {
        query: "What are the three guarantees in the CAP theorem?",
        knowledgeSourceIds: [sourceDoc.id],
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.answer);
    assert.match(res.body.data.answer, /Consistency|Availability|Partition/i);
    assert.ok(Array.isArray(res.body.data.sources));
    console.log("✓ Ask PrepMind RAG Q&A succeeded with grounded answer.");
  });

  test("STAGE 3: Generate Summary via RAG", async () => {
    const start = Date.now();
    const res = await apiRequest("/api/rag/summary", {
      method: "POST",
      body: {
        knowledgeSourceIds: [sourceDoc.id],
        regenerate: true,
      },
    });

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.content);
    console.log(`✓ Summary generated in ${duration}s.`);
  });

  test("STAGE 4: Generate Study Notes via RAG", async () => {
    const start = Date.now();
    const res = await apiRequest("/api/rag/notes", {
      method: "POST",
      body: {
        knowledgeSourceIds: [sourceDoc.id],
        regenerate: true,
      },
    });

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.content);
    console.log(`✓ Study Notes generated in ${duration}s.`);
  });

  test("STAGE 5: Generate Practice Paper via RAG", async () => {
    const start = Date.now();
    const res = await apiRequest("/api/rag/practice-paper", {
      method: "POST",
      body: {
        knowledgeSourceIds: [sourceDoc.id],
        totalMarks: 60,
        difficulty: "Medium",
        regenerate: true,
      },
    });

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.title);
    assert.ok(Array.isArray(res.body.data.sections));
    console.log(`✓ Practice Paper generated in ${duration}s with ${res.body.data.sections.length} sections.`);
  });

  test("STAGE 6: Generate Viva Assessment via RAG", async () => {
    const start = Date.now();
    const res = await apiRequest("/api/rag/viva", {
      method: "POST",
      body: {
        knowledgeSourceIds: [sourceDoc.id],
        questionCount: 3,
        difficulty: "Medium",
        regenerate: true,
      },
    });

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.questions));
    assert.equal(res.body.data.questions.length, 3);
    console.log(`✓ Viva generated in ${duration}s with 3 oral questions.`);
  });

  test("STAGE 7: Generate Quiz 3, 5, 8, 10 Questions and Validate Exact Counts", async () => {
    for (const count of [3, 5, 8, 10]) {
      const start = Date.now();
      const res = await apiRequest("/api/rag/quiz", {
        method: "POST",
        body: {
          knowledgeSourceIds: [sourceDoc.id],
          questionCount: count,
          difficulty: "Medium",
          questionType: "MCQ",
          regenerate: true,
        },
      });

      const duration = ((Date.now() - start) / 1000).toFixed(2);
      assert.equal(res.status, 201, `Failed to generate quiz with count ${count}`);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.questions));
      assert.equal(res.body.data.questions.length, count, `Expected ${count} questions but got ${res.body.data.questions.length}`);
      
      const validated = validateQuizQuestionSet(res.body.data, { questionCount: count, questionType: "MCQ" });
      assert.equal(validated.questions.length, count);
      console.log(`✓ Quiz Count ${count} verified: exactly ${count} questions generated in ${duration}s.`);
    }
  });

  test("STAGE 8: Submit Quiz Attempt, Verify Selected Answers & Evaluation Integrity", async () => {
    // Generate a 5-question quiz for submission
    const quizRes = await apiRequest("/api/rag/quiz", {
      method: "POST",
      body: {
        knowledgeSourceIds: [sourceDoc.id],
        questionCount: 5,
        difficulty: "Medium",
        questionType: "MCQ",
        regenerate: true,
      },
    });

    assert.equal(quizRes.status, 201);
    const quizData = quizRes.body.data;
    const questions = quizData.questions;

    // Simulate user answering 4 questions (3 correct, 1 wrong, 1 left unanswered)
    const answersPayload = [
      { questionId: questions[0].id || questions[0]._id, userAnswer: questions[0].correctAnswer },
      { questionId: questions[1].id || questions[1]._id, userAnswer: questions[1].correctAnswer },
      { questionId: questions[2].id || questions[2]._id, userAnswer: questions[2].correctAnswer },
      { questionId: questions[3].id || questions[3]._id, userAnswer: "Incorrect Option" },
      { questionId: questions[4].id || questions[4]._id, userAnswer: "" }, // Unanswered
    ];

    const attemptRes = await apiRequest(`/api/rag/assessments/${quizData.id}/attempt`, {
      method: "POST",
      body: {
        answers: answersPayload,
        timeSpentSeconds: 65,
      },
    });

    assert.equal(attemptRes.status, 201);
    assert.equal(attemptRes.body.success, true);
    const result = attemptRes.body.data;

    assert.equal(result.score, 3);
    assert.equal(result.totalMarks, 5);
    assert.equal(result.percentage, 60);

    assert.equal(result.answers[0].isCorrect, true);
    assert.equal(result.answers[0].userAnswer, questions[0].correctAnswer);

    assert.equal(result.answers[1].isCorrect, true);
    assert.equal(result.answers[1].userAnswer, questions[1].correctAnswer);

    assert.equal(result.answers[2].isCorrect, true);
    assert.equal(result.answers[2].userAnswer, questions[2].correctAnswer);

    assert.equal(result.answers[3].isCorrect, false);
    assert.equal(result.answers[3].userAnswer, "Incorrect Option");

    assert.equal(result.answers[4].isCorrect, false);
    assert.equal(result.answers[4].userAnswer, "");

    // Verify PDF payload mapping integrity
    for (const ans of result.answers) {
      assert.notEqual(ans.userAnswer, undefined);
      assert.notEqual(ans.userAnswer, null);
      assert.notEqual(ans.userAnswer, "(None)");
      assert.notEqual(ans.correctAnswer, undefined);
      assert.notEqual(ans.correctAnswer, null);
    }

    console.log("✓ Quiz attempt submitted: 3/5 score (60%), unanswered preserved as empty, answers evaluated accurately.");
  });
});
