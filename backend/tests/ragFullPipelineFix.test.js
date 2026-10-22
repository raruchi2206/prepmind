const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const http = require("http");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

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

describe("COMPLETE RAG PIPELINE FIX TEST SUITE", { timeout: 300000 }, () => {
  let userA;
  let userB;
  let tokenA;
  let tokenB;
  let resumeSource;
  let osSource;

  before(async () => {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 4000 });
      }
    } catch (err) {
      console.log(`[TEST SETUP] Remote MongoDB Atlas failed (${err.message}). Starting local MongoMemoryServer...`);
      mongod = await MongoMemoryServer.create();
      await mongoose.connect(mongod.getUri());
    }

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    const testEmails = ["resume_user_a@example.com", "os_user_b@example.com"];
    await Promise.all([
      User.deleteMany({ email: { $in: testEmails } }),
    ]);

    userA = await User.create({
      name: "Rana Ruchi",
      username: "ruchi_rag_" + Date.now(),
      email: "resume_user_a@example.com",
      passwordHash: "argon2_fake_hash_12345",
      role: "USER",
      tokenVersion: 0,
      isEmailVerified: true,
    });

    userB = await User.create({
      name: "User B (OS)",
      username: "os_user_b_" + Date.now(),
      email: "os_user_b@example.com",
      passwordHash: "argon2_fake_hash_12345",
      role: "USER",
      tokenVersion: 0,
      isEmailVerified: true,
    });

    tokenA = createAccessToken(userA);
    tokenB = createAccessToken(userB);
  });

  after(async () => {
    const testEmails = ["resume_user_a@example.com", "os_user_b@example.com"];
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

    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongod) await mongod.stop();
  });

  test("RULE #36: Direct AI Service Health Check", async () => {
    const health = await aiServiceClient.checkHealth();
    assert.equal(health.service, "prepmind-ai-service");
    assert.equal(health.textGenerationProvider, "groq");
    assert.ok(health.embeddingDimension === 384);
  });

  test("RULE #4 & #5: Ingest Real Resume for User A into MongoDB and FAISS", async () => {
    const testDir = path.join(__dirname, "../storage/test_docs");
    fs.mkdirSync(testDir, { recursive: true });
    const resumePath = path.join(testDir, "RANA_RUCHI_Resume.txt");
    fs.writeFileSync(
      resumePath,
      `RANA RUCHI NAVINCHANDRA
Email: raruchi2206@gmail.com
Profile: Full-Stack & AI Software Engineer

PROJECTS:
1. PrepMind — AI-Powered RAG Knowledge-to-Assessment Platform:
Developed an intelligent academic evaluation and study platform featuring document ingestion, Ollama embeddings, FAISS vector indexing, and grounded quiz/notes generation.
2. MediCare AI Assistant:
Built a healthcare diagnostic assistant using Next.js, Python FastAPI, and medical classification models.
3. FinTrack Ledger:
Created a real-time distributed financial transaction audit system using Node.js and PostgreSQL.

SKILLS:
Languages: JavaScript, TypeScript, Python, SQL
Frameworks: React, Express, FastAPI, PyTorch, Tailwind CSS
Databases: MongoDB, PostgreSQL, FAISS Vector Database`,
      "utf-8"
    );

    const formData = new FormData();
    const fileBytes = fs.readFileSync(resumePath);
    formData.append("file", new Blob([fileBytes], { type: "text/plain" }), "RANA_RUCHI_Resume.txt");
    formData.append("title", "RANA_RUCHI_NAVINCHANDRA_FlowCV_Resume_2026-09-26");

    const uploadRes = await apiRequest("/api/knowledge/upload", {
      method: "POST",
      token: tokenA,
      body: formData,
    });
    assert.equal(uploadRes.status, 201);
    resumeSource = uploadRes.body.data.knowledgeSource;

    const procRes = await apiRequest(`/api/knowledge/${resumeSource.id}/process`, {
      method: "POST",
      token: tokenA,
    });
    assert.equal(procRes.status, 200);
    assert.equal(procRes.body.data.knowledgeSource.status, "READY");

    // Verify FAISS stats
    const stats = await aiServiceClient.getUserStats(userA._id);
    assert.ok(stats.vectorCount > 0);
    assert.equal(stats.dimension, 384);
  });

  test("RULE #6: Idempotent Reindex API (POST /api/knowledge/:id/reindex)", async () => {
    const reindexRes = await apiRequest(`/api/knowledge/${resumeSource.id}/reindex`, {
      method: "POST",
      token: tokenA,
    });
    assert.equal(reindexRes.status, 200);
    assert.equal(reindexRes.body.success, true);
    assert.equal(reindexRes.body.data.knowledgeSource.status, "READY");

    const stats = await aiServiceClient.getUserStats(userA._id);
    assert.ok(stats.vectorCount > 0);
  });

  test("RULE #33: Ask Resume Question ('What are the projects in my resume?')", async () => {
    const res = await apiRequest("/api/rag/ask", {
      method: "POST",
      token: tokenA,
      body: {
        query: "What are the projects in my resume?",
        knowledgeSourceIds: [resumeSource.id],
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.insufficientContext, false);
    assert.ok(res.body.data.chunksRetrieved > 0);
    assert.match(res.body.data.answer, /PrepMind|MediCare|FinTrack/i);
    assert.ok(Array.isArray(res.body.data.sources));
  });

  test("RULE #34: Semantic Question ('What AI applications have I built?')", async () => {
    const res = await apiRequest("/api/rag/ask", {
      method: "POST",
      token: tokenA,
      body: {
        query: "What AI applications have I built?",
        knowledgeSourceIds: [resumeSource.id],
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.insufficientContext, false);
    assert.match(res.body.data.answer, /PrepMind|MediCare/i);
  });

  test("RULE #35: Negative Question absent from resume — Zero LLM hallucination", async () => {
    const res = await apiRequest("/api/rag/ask", {
      method: "POST",
      token: tokenA,
      body: {
        query: "What was my score in a university quantum mechanics and astrophysics exam in 2018?",
        knowledgeSourceIds: [resumeSource.id],
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.match(res.body.data.answer, /couldn't find enough information|does not contain enough information/i);
  });

  test("RULE #9: User Isolation — User B cannot retrieve User A's resume", async () => {
    const res = await apiRequest("/api/rag/retrieve", {
      method: "POST",
      token: tokenB,
      body: {
        query: "PrepMind platform and resume projects",
      },
    });

    assert.equal(res.status, 200);
    // Must return 0 chunks because User B has no documents mentioning PrepMind
    assert.equal(res.body.data.chunks.length, 0);
  });
});
