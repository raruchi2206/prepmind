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
const { validateQuizQuestionSet, questionLooksSimilar } = require("../src/utils/quizValidation");

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

describe("PREPMIND Quiz Acceptance & 9/10 Failure Resolution Suite", { timeout: 600000 }, () => {
  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    const testEmail = "quiz_acceptance_tester@example.com";
    await User.deleteMany({ email: testEmail });

    user = await User.create({
      name: "Quiz Quality Engineer",
      username: "quiz_qc_" + Date.now(),
      email: testEmail,
      passwordHash: "$2b$10$FakeHashForTestingOnly1234567890123456789012",
      role: "USER",
      tokenVersion: 0,
      isEmailVerified: true,
    });

    token = createAccessToken(user);

    // Create and ingest rich document with multiple distinct sections
    const testDir = path.join(__dirname, "../storage/test_docs");
    fs.mkdirSync(testDir, { recursive: true });
    const txtPath = path.join(testDir, "systems_and_cloud_architecture.txt");
    const content = `Full-Stack Systems and Cloud Infrastructure Comprehensive Guide:

Section 1: Distributed Data Systems and CAP Theorem
The CAP Theorem, formulated by Eric Brewer, establishes that in any asynchronous network subject to partitions, a distributed data store can simultaneously guarantee at most two of three properties: Consistency, Availability, and Partition Tolerance. Because physical networks inevitably experience packet loss and latency, Partition Tolerance (P) is mandatory. Systems must choose between CP (Consistency and Partition Tolerance, such as MongoDB or HBase) where writes fail if consistency cannot be proven, and AP (Availability and Partition Tolerance, such as Apache Cassandra or DynamoDB) where all nodes accept reads and writes using eventual consistency and vector clocks.

Section 2: Consensus Protocols and Raft Algorithm
The Raft Consensus Algorithm manages replicated state machines across clusters. Raft decomposes consensus into three independent subproblems: Leader Election, Log Replication, and Safety. Nodes operate in one of three states: Follower, Candidate, or Leader. Heartbeats maintain leadership leases. When a leader fails, a randomized election timer triggers election terms. Raft ensures strong safety by mandating that a candidate must contain all committed entries to win an election.

Section 3: Database Normalization and Schema Design
Relational database normalization eliminates data redundancy and prevents update anomalies. First Normal Form (1NF) enforces atomic attribute domains. Second Normal Form (2NF) requires 1NF and removes partial dependencies on candidate keys. Third Normal Form (3NF) removes transitive dependencies where non-prime attributes depend on other non-prime attributes. Boyce-Codd Normal Form (BCNF) strictly requires that every determinant is a candidate key.

Section 4: Containerization and Kubernetes Orchestration
Docker packages application binaries and dependencies into immutable container images using Linux cgroups and namespaces. Kubernetes coordinates containerized workloads using declarative manifests. The Control Plane consists of the API Server, etcd key-value store, Controller Manager, and Kube-Scheduler. Worker nodes run kubelet, kube-proxy, and the container runtime. Horizontal Pod Autoscalers (HPA) scale pods dynamically based on CPU utilization and custom metrics.

Section 5: API Architecture and Microservices Patterns
Microservices partition large software domains into independently deployable services communicating over gRPC or RESTful JSON APIs. The API Gateway pattern handles authentication, SSL termination, and rate limiting. The Circuit Breaker pattern prevents cascading failures across distributed microservices by failing fast when downstream services become unresponsive.`;

    fs.writeFileSync(txtPath, content, "utf8");

    const formData = new FormData();
    const fileBytes = fs.readFileSync(txtPath);
    formData.append("file", new Blob([fileBytes], { type: "text/plain" }), "systems_and_cloud_architecture.txt");
    formData.append("title", "Full-Stack Systems and Cloud Architecture");

    const uploadRes = await apiRequest("/api/knowledge/upload", {
      method: "POST",
      body: formData,
    });

    assert.equal(uploadRes.status, 201);
    sourceDoc = uploadRes.body.data.knowledgeSource;

    const processRes = await apiRequest(`/api/knowledge/${sourceDoc.id}/process`, {
      method: "POST",
    });

    assert.equal(processRes.status, 200);
    assert.equal(processRes.body.data.status, "READY");
    console.log("✓ Test document uploaded and indexed in FAISS + MongoDB.");
  });

  after(async () => {
    if (user) {
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

  test("Acceptance Test: Generate exactly 3 MCQ questions", async () => {
    const res = await apiRequest("/api/rag/quiz", {
      method: "POST",
      body: {
        knowledgeSourceIds: [sourceDoc.id],
        questionCount: 3,
        difficulty: "Medium",
        questionType: "MCQ",
        regenerate: true,
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    const questions = res.body.data.questions;
    assert.equal(questions.length, 3, "Must return exactly 3 questions");

    for (const q of questions) {
      assert.ok(q.question && q.question.length > 5);
      assert.equal(q.options.length, 4, "Every MCQ must have exactly 4 options");
      assert.ok(q.options.includes(q.correctAnswer), "correctAnswer must be one of options");
      assert.ok(q.explanation && q.explanation.length > 5);
    }
    console.log("✓ 3-question quiz generated successfully with exact count and valid schema.");
  });

  test("Acceptance Test: Generate exactly 5 MCQ questions", async () => {
    const res = await apiRequest("/api/rag/quiz", {
      method: "POST",
      body: {
        knowledgeSourceIds: [sourceDoc.id],
        questionCount: 5,
        difficulty: "Medium",
        questionType: "MCQ",
        regenerate: true,
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    const questions = res.body.data.questions;
    assert.equal(questions.length, 5, "Must return exactly 5 questions");

    for (const q of questions) {
      assert.equal(q.options.length, 4);
      assert.ok(q.options.includes(q.correctAnswer));
    }
    console.log("✓ 5-question quiz generated successfully with exact count and valid schema.");
  });

  test("Acceptance Test: Generate exactly 8 MCQ questions", async () => {
    const res = await apiRequest("/api/rag/quiz", {
      method: "POST",
      body: {
        knowledgeSourceIds: [sourceDoc.id],
        questionCount: 8,
        difficulty: "Medium",
        questionType: "MCQ",
        regenerate: true,
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    const questions = res.body.data.questions;
    assert.equal(questions.length, 8, "Must return exactly 8 questions");

    for (const q of questions) {
      assert.equal(q.options.length, 4);
      assert.ok(q.options.includes(q.correctAnswer));
    }
    console.log("✓ 8-question quiz generated successfully with exact count and valid schema.");
  });

  test("Acceptance Test: Generate exactly 10 MCQ questions (9/10 Resolution Test)", async () => {
    const start = Date.now();
    const res = await apiRequest("/api/rag/quiz", {
      method: "POST",
      body: {
        knowledgeSourceIds: [sourceDoc.id],
        questionCount: 10,
        difficulty: "Medium",
        questionType: "MCQ",
        regenerate: true,
      },
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    assert.equal(res.status, 201, `Failed to generate 10 questions: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    const questions = res.body.data.questions;
    assert.equal(questions.length, 10, "Must return exactly 10 questions");

    // Verify uniqueness (no duplicate questions)
    for (let i = 0; i < questions.length; i++) {
      for (let j = i + 1; j < questions.length; j++) {
        const isDup = questionLooksSimilar(questions[i].question, questions[j].question);
        assert.equal(isDup, false, `Question ${i + 1} and ${j + 1} are duplicates: "${questions[i].question}" vs "${questions[j].question}"`);
      }
    }

    // Verify options, correct answers, and explanations
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      assert.equal(q.questionNumber, i + 1);
      assert.ok(q.question && q.question.trim().length > 0);
      assert.equal(q.options.length, 4, `Question ${i + 1} must have 4 options`);
      assert.ok(q.options.includes(q.correctAnswer), `Question ${i + 1} correctAnswer '${q.correctAnswer}' not in options ${JSON.stringify(q.options)}`);
      assert.ok(q.explanation && q.explanation.trim().length > 0, `Question ${i + 1} must have explanation`);
    }

    console.log(`✓ 10-question quiz generated in ${elapsed}s: ALL 10 questions valid, unique, with 4 options and correct answers.`);
  });
});
