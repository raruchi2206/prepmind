const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const http = require("http");
const argon2 = require("argon2");
const path = require("path");
const fs = require("fs");

process.env.NODE_ENV = "test";

const app = require("../src/app");
const { env } = require("../src/config/env");
const User = require("../src/models/User");
const KnowledgeSource = require("../src/models/KnowledgeSource");
const { createAccessToken } = require("../src/services/tokenService");

let server;
let baseUrl;

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = { ...(options.headers || {}) };

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (options.cookies) {
    headers["Cookie"] = Object.entries(options.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
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

  const data = await res.json().catch(() => ({}));
  return {
    status: res.status,
    headers: res.headers,
    body: data,
  };
}

describe("PREPMIND Stage 2 — Knowledge Management Test Suite", () => {
  let userA, userB;
  let userACookies, userBCookies;
  let createdSourceId;

  before(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(env.MONGODB_URI, { dbName: "prepmind_test" });
    }

    // Clean test data
    await User.deleteMany({ email: /@knowledgetest\.com$/ });
    await KnowledgeSource.deleteMany({});

    userA = await User.create({
      name: "Alice Scholar",
      email: "alice@knowledgetest.com",
      username: "alicescholar",
      passwordHash: await argon2.hash("Password@123", {
        type: argon2.argon2id,
      }),
      role: "USER",
    });

    userB = await User.create({
      name: "Bob Student",
      email: "bob@knowledgetest.com",
      username: "bobstudent",
      passwordHash: await argon2.hash("Password@123", {
        type: argon2.argon2id,
      }),
      role: "USER",
    });

    userACookies = { pm_access_token: createAccessToken(userA) };
    userBCookies = { pm_access_token: createAccessToken(userB) };

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await User.deleteMany({ email: /@knowledgetest\.com$/ });
    await KnowledgeSource.deleteMany({});
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ==========================================
  // 1. CREATE KNOWLEDGE SOURCE
  // ==========================================
  test("1. Create knowledge source (POST /api/knowledge) auto-assigns userId and status UPLOADING", async () => {
    const res = await request("/api/knowledge", {
      method: "POST",
      cookies: userACookies,
      body: {
        title: "Operating Systems Lecture Notes",
        type: "PDF",
        userId: userB._id.toString(), // Attacker tries to inject another userId
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.knowledgeSource.id);
    assert.equal(
      res.body.data.knowledgeSource.title,
      "Operating Systems Lecture Notes",
    );
    assert.equal(res.body.data.knowledgeSource.type, "PDF");
    assert.equal(res.body.data.knowledgeSource.status, "UPLOADING");
    assert.equal(
      res.body.data.knowledgeSource.userId,
      userA._id.toString(), // Server forces userA ID
    );

    createdSourceId = res.body.data.knowledgeSource.id;
  });

  test("2. Create YouTube knowledge source requires youtubeUrl", async () => {
    const failRes = await request("/api/knowledge", {
      method: "POST",
      cookies: userACookies,
      body: {
        title: "DBMS Video",
        type: "YOUTUBE",
      },
    });
    assert.equal(failRes.status, 422);

    const successRes = await request("/api/knowledge", {
      method: "POST",
      cookies: userACookies,
      body: {
        title: "DBMS Video Lecture",
        type: "YOUTUBE",
        youtubeUrl: "https://www.youtube.com/watch?v=12345678",
      },
    });
    assert.equal(successRes.status, 201);
    assert.equal(successRes.body.data.knowledgeSource.type, "YOUTUBE");
    assert.equal(
      successRes.body.data.knowledgeSource.youtubeUrl,
      "https://www.youtube.com/watch?v=12345678",
    );
  });

  // ==========================================
  // 2. GET ALL KNOWLEDGE SOURCES
  // ==========================================
  test("3. Get all knowledge sources (GET /api/knowledge) returns ONLY the authenticated user's records", async () => {
    // User B creates 1 source
    await request("/api/knowledge", {
      method: "POST",
      cookies: userBCookies,
      body: {
        title: "Bob's Chemistry Notes",
        type: "TXT",
      },
    });

    // User A fetches list
    const resA = await request("/api/knowledge", { cookies: userACookies });
    assert.equal(resA.status, 200);
    assert.equal(resA.body.data.knowledgeSources.length, 2);
    assert.ok(
      resA.body.data.knowledgeSources.every(
        (s) => s.userId === userA._id.toString(),
      ),
    );

    // User B fetches list
    const resB = await request("/api/knowledge", { cookies: userBCookies });
    assert.equal(resB.status, 200);
    assert.equal(resB.body.data.knowledgeSources.length, 1);
    assert.equal(
      resB.body.data.knowledgeSources[0].title,
      "Bob's Chemistry Notes",
    );
  });

  // ==========================================
  // 3. GET SINGLE KNOWLEDGE SOURCE & IDOR
  // ==========================================
  test("4. Get single knowledge source (GET /api/knowledge/:id) works for owner", async () => {
    const res = await request(`/api/knowledge/${createdSourceId}`, {
      cookies: userACookies,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.knowledgeSource.id, createdSourceId);
  });

  test("5. IDOR Protection: User B cannot access User A's knowledge source (returns 404)", async () => {
    const res = await request(`/api/knowledge/${createdSourceId}`, {
      cookies: userBCookies,
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Knowledge source not found");
  });

  test("6. URL manipulation with non-existent or invalid ObjectId returns 404 or 400 safely", async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res404 = await request(`/api/knowledge/${nonExistentId}`, {
      cookies: userACookies,
    });
    assert.equal(res404.status, 404);

    const res400 = await request(`/api/knowledge/invalid-id-format`, {
      cookies: userACookies,
    });
    assert.equal(res400.status, 400);
  });

  // ==========================================
  // 4. UPDATE KNOWLEDGE SOURCE
  // ==========================================
  test("7. Update title (PATCH /api/knowledge/:id) succeeds for owner", async () => {
    const res = await request(`/api/knowledge/${createdSourceId}`, {
      method: "PATCH",
      cookies: userACookies,
      body: {
        title: "Operating Systems (Revised 2026)",
      },
    });
    assert.equal(res.status, 200);
    assert.equal(
      res.body.data.knowledgeSource.title,
      "Operating Systems (Revised 2026)",
    );
  });

  test("8. Update unallowed fields (status, userId) is blocked/ignored", async () => {
    const res = await request(`/api/knowledge/${createdSourceId}`, {
      method: "PATCH",
      cookies: userACookies,
      body: {
        title: "Operating Systems (Final)",
        status: "READY", // Malicious user tries to set status to READY directly
        userId: userB._id.toString(),
      },
    });
    assert.equal(res.status, 200);
    const dbRecord = await KnowledgeSource.findById(createdSourceId);
    assert.equal(dbRecord.title, "Operating Systems (Final)");
    assert.equal(dbRecord.status, "UPLOADING"); // Status remained UPLOADING
    assert.equal(dbRecord.userId.toString(), userA._id.toString());
  });

  test("9. User B cannot update User A's knowledge source (returns 404)", async () => {
    const res = await request(`/api/knowledge/${createdSourceId}`, {
      method: "PATCH",
      cookies: userBCookies,
      body: {
        title: "Hacked Title",
      },
    });
    assert.equal(res.status, 404);
  });

  // ==========================================
  // 5. DOCUMENT UPLOAD FLOW
  // ==========================================
  test("10. Document file upload (POST /api/knowledge/upload) creates user storage folder and source record", async () => {
    const testFilePath = path.join(__dirname, "sample_test_doc.txt");
    fs.writeFileSync(testFilePath, "Sample knowledge content for PrepMind.");

    const formData = new FormData();
    const fileBlob = new Blob(["Sample knowledge content for PrepMind."], {
      type: "text/plain",
    });
    formData.append("file", fileBlob, "sample_test_doc.txt");
    formData.append("title", "Custom Sample Document");

    const res = await request("/api/knowledge/upload", {
      method: "POST",
      cookies: userACookies,
      body: formData,
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(
      res.body.data.knowledgeSource.title,
      "Custom Sample Document",
    );
    assert.equal(res.body.data.knowledgeSource.type, "TXT");
    assert.equal(res.body.data.knowledgeSource.status, "UPLOADING");
    assert.equal(
      res.body.data.knowledgeSource.originalFileName,
      "sample_test_doc.txt",
    );

    // Verify user directory exists
    const userDir = path.join(
      __dirname,
      "../storage/uploads",
      userA._id.toString(),
    );
    assert.ok(fs.existsSync(userDir));

    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
  });

  test("11. Uploading unallowed file extensions is rejected with 400", async () => {
    const formData = new FormData();
    const exeBlob = new Blob(["binary content"], {
      type: "application/x-msdownload",
    });
    formData.append("file", exeBlob, "malicious_script.exe");

    const res = await request("/api/knowledge/upload", {
      method: "POST",
      cookies: userACookies,
      body: formData,
    });

    assert.equal(res.status, 400);
  });

  // ==========================================
  // 6. DELETE KNOWLEDGE SOURCE
  // ==========================================
  test("12. User B cannot delete User A's knowledge source (returns 404)", async () => {
    const res = await request(`/api/knowledge/${createdSourceId}`, {
      method: "DELETE",
      cookies: userBCookies,
    });
    assert.equal(res.status, 404);
  });

  test("13. Owner can delete knowledge source (DELETE /api/knowledge/:id)", async () => {
    const res = await request(`/api/knowledge/${createdSourceId}`, {
      method: "DELETE",
      cookies: userACookies,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const check = await KnowledgeSource.findById(createdSourceId);
    assert.equal(check, null);
  });

  // ==========================================
  // 7. UNAUTHENTICATED REQUESTS
  // ==========================================
  test("14. Unauthenticated requests to /api/knowledge return 401 Unauthorized", async () => {
    const resGet = await request("/api/knowledge");
    assert.equal(resGet.status, 401);

    const resPost = await request("/api/knowledge", {
      method: "POST",
      body: { title: "Test", type: "PDF" },
    });
    assert.equal(resPost.status, 401);
  });
});
