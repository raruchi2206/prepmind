const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const http = require("http");
const mongoose = require("mongoose");

process.env.NODE_ENV = "test";

const app = require("../src/app");
const { env } = require("../src/config/env");
const User = require("../src/models/User");
const KnowledgeSource = require("../src/models/KnowledgeSource");
const KnowledgeChunk = require("../src/models/KnowledgeChunk");
const GeneratedContent = require("../src/models/GeneratedContent");
const Assessment = require("../src/models/Assessment");
const Attempt = require("../src/models/Attempt");
const Conversation = require("../src/models/Conversation");
const { createAccessToken } = require("../src/services/tokenService");
const aiServiceClient = require("../src/services/aiServiceClient");

const { MongoMemoryServer } = require("mongodb-memory-server");

let server;
let baseUrl;
let mongod;

async function apiRequest(reqPath, options = {}) {
  const url = `${baseUrl}${reqPath}`;
  const headers = { ...(options.headers || {}) };

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (options.token) {
    headers["Cookie"] = `pm_access_token=${options.token}`;
    headers["Authorization"] = `Bearer ${options.token}`;
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

describe("STAGE 4 + 5 SUITE: RAG Knowledge Retrieval and AI Generation", { timeout: 600000 }, () => {
  let userA;
  let userB;
  let tokenA;
  let tokenB;
  let sourceA;
  let sourceB;
  let quizAssessmentId;

  before(async () => {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 4000 });
      }
    } catch (err) {
      console.log(`[TEST SETUP] Remote MongoDB Atlas failed (${err.message}). Starting local MongoMemoryServer...`);
      mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri);
    }

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    const testEmails = ["rag_user_a@example.com", "rag_user_b@example.com"];
    await Promise.all([
      User.deleteMany({ email: { $in: testEmails } }),
      KnowledgeSource.deleteMany({ title: { $regex: /RAG Test/i } }),
    ]);

    userA = await User.create({
      name: "User A (DBMS)",
      username: "rag_user_a_" + Date.now(),
      email: "rag_user_a@example.com",
      passwordHash: "$2b$10$FakeHashForTestingOnly1234567890123456789012",
      role: "USER",
      tokenVersion: 0,
      isEmailVerified: true,
    });

    userB = await User.create({
      name: "User B (OS)",
      username: "rag_user_b_" + Date.now(),
      email: "rag_user_b@example.com",
      passwordHash: "$2b$10$FakeHashForTestingOnly1234567890123456789012",
      role: "USER",
      tokenVersion: 0,
      isEmailVerified: true,
    });

    tokenA = createAccessToken(userA);
    tokenB = createAccessToken(userB);
  });

  after(async () => {
    const testEmails = ["rag_user_a@example.com", "rag_user_b@example.com"];
    const users = await User.find({ email: { $in: testEmails } });
    const userIds = users.map((u) => u._id);

    await Promise.all([
      KnowledgeChunk.deleteMany({ userId: { $in: userIds } }),
      KnowledgeSource.deleteMany({ userId: { $in: userIds } }),
      GeneratedContent.deleteMany({ userId: { $in: userIds } }),
      Assessment.deleteMany({ userId: { $in: userIds } }),
      Attempt.deleteMany({ userId: { $in: userIds } }),
      Conversation.deleteMany({ userId: { $in: userIds } }),
      User.deleteMany({ _id: { $in: userIds } }),
    ]);

    for (const uid of userIds) {
      await aiServiceClient.deleteSourceVectors(uid, "all").catch(() => {});
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    if (mongod) {
      await mongod.stop();
    }
  });

  test("TEST 1: Ingest DBMS Document for User A with FAISS Indexing", async () => {
    const testDir = path.join(__dirname, "../storage/test_docs");
    fs.mkdirSync(testDir, { recursive: true });
    const txtPath = path.join(testDir, "dbms_test.txt");
    fs.writeFileSync(
      txtPath,
      `Database Management Systems (DBMS) - Relational Normalization
1. Normalization is the process of structuring relational database schemas to minimize data redundancy and prevent insertion, update, and deletion anomalies.
2. First Normal Form (1NF) requires all attribute values to be atomic and indivisible.
3. Second Normal Form (2NF) is achieved when the relation is in 1NF and no non-prime attribute is partially dependent on any candidate key.
4. Third Normal Form (3NF) eliminates transitive functional dependencies, ensuring every non-prime attribute depends directly only on candidate keys.
5. Boyce-Codd Normal Form (BCNF) is a stricter normal form where every determinant must be a candidate key.
6. ACID Properties guarantee reliable transactions: Atomicity ensures all-or-nothing execution, Consistency maintains integrity constraints, Isolation prevents concurrent race conditions, and Durability ensures committed updates persist.`,
      "utf-8"
    );

    const formData = new FormData();
    const fileBytes = fs.readFileSync(txtPath);
    formData.append("file", new Blob([fileBytes], { type: "text/plain" }), "dbms_test.txt");
    formData.append("title", "RAG Test DBMS Normalization Master");

    const uploadRes = await apiRequest("/api/knowledge/upload", {
      method: "POST",
      token: tokenA,
      body: formData,
    });

    assert.equal(uploadRes.status, 201);
    sourceA = uploadRes.body.data.knowledgeSource;
    assert.ok(sourceA.id);

    // Process ingestion (extraction -> cleaning -> chunking -> embedding -> FAISS index -> READY)
    const procRes = await apiRequest(`/api/knowledge/${sourceA.id}/process`, {
      method: "POST",
      token: tokenA,
    });

    assert.equal(procRes.status, 200);
    assert.equal(procRes.body.data.knowledgeSource.status, "READY");
    assert.ok(procRes.body.data.chunkCount > 0);

    const chunks = await KnowledgeChunk.find({ knowledgeSourceId: sourceA.id, userId: userA._id });
    assert.ok(chunks.length > 0);
  });

  test("TEST 2: Ingest OS Document for User B with FAISS Indexing", async () => {
    const testDir = path.join(__dirname, "../storage/test_docs");
    const osPath = path.join(testDir, "os_test.txt");
    fs.writeFileSync(
      osPath,
      `Operating Systems - Virtual Memory and Paging
1. Virtual Memory provides an illusion of a large contiguous memory space to user programs by mapping virtual addresses to physical frames.
2. Paging divides virtual memory into fixed-size blocks called pages, and physical memory into frames.
3. Page Replacement Algorithms like LRU (Least Recently Used) and FIFO manage page faults when frames are full.
4. Thrashing occurs when a computer's virtual memory subsystem is in a constant state of paging, rapidly exchanging data between memory and disk.`,
      "utf-8"
    );

    const formData = new FormData();
    const fileBytes = fs.readFileSync(osPath);
    formData.append("file", new Blob([fileBytes], { type: "text/plain" }), "os_test.txt");
    formData.append("title", "RAG Test OS Virtual Memory Notes");

    const uploadRes = await apiRequest("/api/knowledge/upload", {
      method: "POST",
      token: tokenB,
      body: formData,
    });

    assert.equal(uploadRes.status, 201);
    sourceB = uploadRes.body.data.knowledgeSource;

    const procRes = await apiRequest(`/api/knowledge/${sourceB.id}/process`, {
      method: "POST",
      token: tokenB,
    });

    assert.equal(procRes.status, 200);
    assert.equal(procRes.body.data.knowledgeSource.status, "READY");
  });

  test("TEST 3: RAG Semantic Vector Retrieval for User A", async () => {
    const res = await apiRequest("/api/rag/retrieve", {
      method: "POST",
      token: tokenA,
      body: {
        query: "What is 3NF and transitive dependency?",
        knowledgeSourceIds: [sourceA.id],
        topK: 3,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.chunks));
    assert.ok(res.body.data.chunks.length > 0);
    assert.match(res.body.data.chunks[0].text, /3NF|Normalization|dependency/i);
  });

  test("TEST 4: USER ISOLATION — User A cannot retrieve User B's documents", async () => {
    const res = await apiRequest("/api/rag/retrieve", {
      method: "POST",
      token: tokenA,
      body: {
        query: "Explain virtual memory and thrashing",
        topK: 5,
      },
    });

    assert.equal(res.status, 200);
    for (const c of res.body.data.chunks) {
      assert.notEqual(c.knowledgeSourceId, sourceB.id);
    }
  });

  test("TEST 5: Ask PrepMind RAG Q&A with Citations", async () => {
    const res = await apiRequest("/api/rag/ask", {
      method: "POST",
      token: tokenA,
      body: {
        query: "Explain the ACID properties mentioned in the document.",
        knowledgeSourceIds: [sourceA.id],
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.answer);
    assert.match(res.body.data.answer, /Atomicity|Consistency|Isolation|Durability/i);
    assert.ok(Array.isArray(res.body.data.sources));
    assert.ok(res.body.data.conversationId);
  });

  test("TEST 6: Generate Summary via RAG", async () => {
    const res = await apiRequest("/api/rag/generate/summary", {
      method: "POST",
      token: tokenA,
      body: {
        knowledgeSourceIds: [sourceA.id],
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.title);
    assert.ok(res.body.data.content);

    const doc = await GeneratedContent.findOne({ _id: res.body.data.id, userId: userA._id });
    assert.ok(doc);
    assert.equal(doc.type, "SUMMARY");
  });

  test("TEST 7: Generate Study Notes via RAG", async () => {
    const res = await apiRequest("/api/rag/generate/notes", {
      method: "POST",
      token: tokenA,
      body: {
        knowledgeSourceIds: [sourceA.id],
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.content);

    const doc = await GeneratedContent.findOne({ _id: res.body.data.id, userId: userA._id });
    assert.ok(doc);
    assert.equal(doc.type, "NOTES");
  });

  test("TEST 8: Generate Quiz via RAG", async () => {
    const res = await apiRequest("/api/rag/generate/quiz", {
      method: "POST",
      token: tokenA,
      body: {
        knowledgeSourceIds: [sourceA.id],
        questionCount: 3,
        difficulty: "Medium",
        questionType: "MCQ",
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    quizAssessmentId = res.body.data.id;
    assert.ok(Array.isArray(res.body.data.questions));

    const assessment = await Assessment.findOne({ _id: quizAssessmentId, userId: userA._id });
    assert.ok(assessment);
    assert.equal(assessment.type, "QUIZ");
  });

  test("TEST 9: Submit Quiz Attempt & Deterministic Scoring", async () => {
    const assessment = await Assessment.findById(quizAssessmentId);
    const answers = assessment.questions.map((q) => ({
      questionId: q.id,
      userAnswer: q.correctAnswer,
    }));

    const res = await apiRequest(`/api/rag/assessments/${quizAssessmentId}/attempt`, {
      method: "POST",
      token: tokenA,
      body: {
        answers,
        timeSpentSeconds: 45,
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.score, assessment.questions.length);
    assert.equal(res.body.data.percentage, 100);

    const attempt = await Attempt.findOne({ _id: res.body.data.id, userId: userA._id });
    assert.ok(attempt);
  });

  test("TEST 10: Generate Practice Paper via RAG", async () => {
    const res = await apiRequest("/api/rag/generate/paper", {
      method: "POST",
      token: tokenA,
      body: {
        knowledgeSourceIds: [sourceA.id],
        totalMarks: 50,
        difficulty: "Medium",
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.ok(Array.isArray(res.body.data.sections));
  });

  test("TEST 11: History API loads real user artifacts", async () => {
    const res = await apiRequest("/api/history", {
      method: "GET",
      token: tokenA,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const items = res.body.data.items;
    assert.ok(Array.isArray(items));
    assert.ok(items.length >= 4);
  });

  test("TEST 12: Progress API aggregates real MongoDB metrics", async () => {
    const res = await apiRequest("/api/progress", {
      method: "GET",
      token: tokenA,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const progress = res.body.data;
    assert.equal(progress.sourcesCount, 1);
    assert.ok(progress.quizzesAttempted >= 1);
    assert.equal(progress.averageScore, 100);
  });

  test("TEST 13: Delete KnowledgeSource cascades FAISS vector cleanup", async () => {
    const delRes = await apiRequest(`/api/knowledge/${sourceA.id}`, {
      method: "DELETE",
      token: tokenA,
    });

    assert.equal(delRes.status, 200);

    const foundSource = await KnowledgeSource.findById(sourceA.id);
    assert.equal(foundSource, null);

    const remainingChunks = await KnowledgeChunk.find({ knowledgeSourceId: sourceA.id });
    assert.equal(remainingChunks.length, 0);
  });
});
