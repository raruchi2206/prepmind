const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.NODE_ENV = "test";

const app = require("../src/app");
const { env } = require("../src/config/env");
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
    body: options.body ? JSON.stringify(options.body) : undefined,
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

describe("MANDATORY GROQ API INTEGRATION SUITE", () => {
  before(async () => {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 4000 });
      }
    } catch {
      mongod = await MongoMemoryServer.create();
      await mongoose.connect(mongod.getUri());
    }

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://localhost:${server.address().port}`;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongod) await mongod.stop();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  test("1. Environment variables GROQ_MODEL and GROQ_API_KEY exist in config schema", () => {
    assert.ok(env.GROQ_MODEL, "GROQ_MODEL must have a default or configured value");
    assert.equal(env.GROQ_MODEL, "openai/gpt-oss-120b");
    assert.ok("GROQ_API_KEY" in env, "GROQ_API_KEY must be in env schema");
    assert.ok("AI_PRIMARY_PROVIDER" in env, "AI_PRIMARY_PROVIDER must be in env schema");
    assert.ok("AI_FALLBACK_PROVIDER" in env, "AI_FALLBACK_PROVIDER must be in env schema");
  });

  test("2. /api/ai/health reports primary Groq and fallback Ollama hybrid status", async () => {
    const res = await apiRequest("/api/ai/health");
    if (res.status === 200) {
      assert.equal(res.body.success, true);
      assert.equal(res.body.primaryProvider, "groq");
      assert.equal(res.body.fallbackProvider, "ollama");
      assert.ok(res.body.groqAvailable);
    } else {
      assert.equal(res.status, 503);
      assert.equal(res.body.success, false);
    }
  });

  test("3. Embeddings and FAISS vector retrieval remain separate from text generation", () => {
    // Verify client has distinct methods for FAISS vector search and RAG text generation
    assert.equal(typeof aiServiceClient.searchVectors, "function");
    assert.equal(typeof aiServiceClient.indexChunks, "function");
    assert.equal(typeof aiServiceClient.deleteSourceVectors, "function");
    assert.equal(typeof aiServiceClient.getUserStats, "function");
    assert.equal(typeof aiServiceClient.askRAG, "function");
    assert.equal(typeof aiServiceClient.generateSummary, "function");
    assert.equal(typeof aiServiceClient.generateNotes, "function");
    assert.equal(typeof aiServiceClient.generateQuiz, "function");
    assert.equal(typeof aiServiceClient.generatePracticePaper, "function");
    assert.equal(typeof aiServiceClient.generateViva, "function");
    assert.equal(typeof aiServiceClient.evaluateAnswer, "function");
  });

  test("4. Error formatting handles Groq API timeouts and connection failures clearly", () => {
    const fakeError = new Error("request timeout");
    fakeError.cause = { code: "ETIMEDOUT" };
    const formatted = aiServiceClient.formatConnectionError(fakeError, "AI generation service");
    assert.match(formatted, /timeout/i);
  });
});
