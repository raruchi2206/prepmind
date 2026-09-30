const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const http = require("http");
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");

process.env.NODE_ENV = "test";

const app = require("../src/app");
const { env } = require("../src/config/env");
const User = require("../src/models/User");
const KnowledgeSource = require("../src/models/KnowledgeSource");
const KnowledgeChunk = require("../src/models/KnowledgeChunk");
const { createAccessToken } = require("../src/services/tokenService");

let server;
let baseUrl;

async function request(reqPath, options = {}) {
  const url = `${baseUrl}${reqPath}`;
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

function createSamplePptxBuffer() {
  const zip = new AdmZip();
  const slide1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>Introduction to Operating Systems</a:t></a:r></a:p>
          <a:p><a:r><a:t>Processes and Threads Overview</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

  const slide2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>Memory Management and Virtual Memory</a:t></a:r></a:p>
          <a:p><a:r><a:t>Paging and Segmentation Algorithms</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;

  zip.addFile("ppt/slides/slide1.xml", Buffer.from(slide1Xml, "utf8"));
  zip.addFile("ppt/slides/slide2.xml", Buffer.from(slide2Xml, "utf8"));
  return zip.toBuffer();
}

function createSampleDocxBuffer() {
  const zip = new AdmZip();
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Database Management Systems Architecture</w:t></w:r></w:p>
    <w:p><w:r><w:t>Relational data model organizes data into one or more tables of columns and rows.</w:t></w:r></w:p>
    <w:p><w:r><w:t>ACID properties ensure reliable processing of database transactions.</w:t></w:r></w:p>
  </w:body>
</w:document>`;
  zip.addFile("word/document.xml", Buffer.from(docXml, "utf8"));
  return zip.toBuffer();
}

async function createSamplePdfBuffer() {
  const { PDFDocument, StandardFonts } = require("pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([600, 400]);
  page.drawText("Software Engineering Principles and Clean Architecture", {
    x: 50,
    y: 350,
    size: 14,
    font,
  });
  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

describe("PREPMIND Stage 3 — Knowledge Ingestion Pipeline Test Suite", () => {
  let userA, userB;
  let userACookies, userBCookies;

  before(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(env.MONGODB_URI, { dbName: "prepmind_test" });
    }

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });

    await User.deleteMany({
      email: { $in: ["ingest_a@prepmind.test", "ingest_b@prepmind.test"] },
    });
    await KnowledgeSource.deleteMany({});
    await KnowledgeChunk.deleteMany({});

    userA = await User.create({
      name: "Ingest User A",
      email: "ingest_a@prepmind.test",
      username: "ingest_user_a",
      passwordHash: "argon2_fake_hash_value_for_testing",
    });

    userB = await User.create({
      name: "Ingest User B",
      email: "ingest_b@prepmind.test",
      username: "ingest_user_b",
      passwordHash: "argon2_fake_hash_value_for_testing",
    });

    const tokenA = createAccessToken(userA);
    const tokenB = createAccessToken(userB);

    userACookies = { pm_access_token: tokenA };
    userBCookies = { pm_access_token: tokenB };
  });

  after(async () => {
    await User.deleteMany({
      email: { $in: ["ingest_a@prepmind.test", "ingest_b@prepmind.test"] },
    });
    await KnowledgeSource.deleteMany({});
    await KnowledgeChunk.deleteMany({});
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("A. TXT Ingestion: extracts, cleans, chunks, saves to DB, sets status READY", async () => {
    const textData = "Operating System Concepts.\n\nAn operating system acts as an intermediary between a user and computer hardware.\n\nKey functions include process management, memory management, and file system management.";
    const formData = new FormData();
    formData.append("file", new Blob([textData], { type: "text/plain" }), "sample_os.txt");
    formData.append("title", "OS Text Notes");

    const uploadRes = await request("/knowledge/upload", {
      method: "POST",
      cookies: userACookies,
      body: formData,
    });

    assert.equal(uploadRes.status, 201);
    const sourceId = uploadRes.body.data.knowledgeSource.id;

    // Process document
    const processRes = await request(`/knowledge/${sourceId}/process`, {
      method: "POST",
      cookies: userACookies,
    });

    assert.equal(processRes.status, 200);
    assert.equal(processRes.body.success, true);
    assert.equal(processRes.body.data.knowledgeSource.status, "READY");
    assert.ok(processRes.body.data.knowledgeSource.metadata.chunkCount > 0);
    assert.ok(processRes.body.data.knowledgeSource.metadata.wordCount > 0);

    // Verify chunks via GET /knowledge/:id/chunks
    const chunksRes = await request(`/knowledge/${sourceId}/chunks`, {
      cookies: userACookies,
    });

    assert.equal(chunksRes.status, 200);
    assert.equal(chunksRes.body.data.chunks.length, processRes.body.data.chunkCount);
    assert.equal(chunksRes.body.data.chunks[0].chunkIndex, 0);
    assert.ok(chunksRes.body.data.chunks[0].text.includes("Operating System Concepts"));
    assert.equal(chunksRes.body.data.chunks[0].metadata.sourceType, "TXT");
  });

  test("B. PDF Ingestion: extracts text, preserves page metadata, sets status READY", async () => {
    const pdfBuf = await createSamplePdfBuffer();
    const formData = new FormData();
    formData.append("file", new Blob([pdfBuf], { type: "application/pdf" }), "sample_se.pdf");
    formData.append("title", "Software Engineering PDF");

    const uploadRes = await request("/knowledge/upload", {
      method: "POST",
      cookies: userACookies,
      body: formData,
    });

    assert.equal(uploadRes.status, 201);
    const sourceId = uploadRes.body.data.knowledgeSource.id;

    const processRes = await request(`/knowledge/${sourceId}/process`, {
      method: "POST",
      cookies: userACookies,
    });

    assert.equal(processRes.status, 200);
    assert.equal(processRes.body.data.knowledgeSource.status, "READY");
    assert.equal(processRes.body.data.knowledgeSource.metadata.pageCount, 1);

    const chunksRes = await request(`/knowledge/${sourceId}/chunks`, {
      cookies: userACookies,
    });

    assert.equal(chunksRes.status, 200);
    assert.equal(chunksRes.body.data.chunks[0].metadata.page, 1);
    assert.equal(chunksRes.body.data.chunks[0].metadata.sourceType, "PDF");
    assert.ok(chunksRes.body.data.chunks[0].text.includes("Software Engineering Principles"));
  });

  test("C. DOCX Ingestion: extracts paragraphs, creates chunks, sets status READY", async () => {
    const docxBuf = createSampleDocxBuffer();
    const formData = new FormData();
    formData.append("file", new Blob([docxBuf], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "sample_dbms.docx");
    formData.append("title", "DBMS Architecture DOCX");

    const uploadRes = await request("/knowledge/upload", {
      method: "POST",
      cookies: userACookies,
      body: formData,
    });

    assert.equal(uploadRes.status, 201);
    const sourceId = uploadRes.body.data.knowledgeSource.id;

    const processRes = await request(`/knowledge/${sourceId}/process`, {
      method: "POST",
      cookies: userACookies,
    });

    assert.equal(processRes.status, 200);
    assert.equal(processRes.body.data.knowledgeSource.status, "READY");

    const chunksRes = await request(`/knowledge/${sourceId}/chunks`, {
      cookies: userACookies,
    });

    assert.equal(chunksRes.status, 200);
    assert.ok(chunksRes.body.data.chunks[0].text.includes("Database Management Systems Architecture"));
    assert.equal(chunksRes.body.data.chunks[0].metadata.sourceType, "DOCX");
  });

  test("D. PPTX Ingestion: extracts slide text with slide numbers, sets status READY", async () => {
    const pptxBuf = createSamplePptxBuffer();
    const formData = new FormData();
    formData.append("file", new Blob([pptxBuf], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }), "sample_slides.pptx");
    formData.append("title", "OS Slides PPTX");

    const uploadRes = await request("/knowledge/upload", {
      method: "POST",
      cookies: userACookies,
      body: formData,
    });

    assert.equal(uploadRes.status, 201);
    const sourceId = uploadRes.body.data.knowledgeSource.id;

    const processRes = await request(`/knowledge/${sourceId}/process`, {
      method: "POST",
      cookies: userACookies,
    });

    assert.equal(processRes.status, 200);
    assert.equal(processRes.body.data.knowledgeSource.status, "READY");

    const chunksRes = await request(`/knowledge/${sourceId}/chunks`, {
      cookies: userACookies,
    });

    assert.equal(chunksRes.status, 200);
    assert.ok(chunksRes.body.data.chunks.some((c) => c.metadata.slide === 1));
    assert.ok(chunksRes.body.data.chunks.some((c) => c.metadata.slide === 2));
    assert.equal(chunksRes.body.data.chunks[0].metadata.sourceType, "PPTX");
  });

  test("E. Empty Document: sets status to FAILED and throws meaningful error", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["   \n\n  \t  "], { type: "text/plain" }), "empty.txt");
    formData.append("title", "Empty Document");

    const uploadRes = await request("/knowledge/upload", {
      method: "POST",
      cookies: userACookies,
      body: formData,
    });

    const sourceId = uploadRes.body.data.knowledgeSource.id;

    const processRes = await request(`/knowledge/${sourceId}/process`, {
      method: "POST",
      cookies: userACookies,
    });

    assert.equal(processRes.status, 400);
    assert.match(processRes.body.message, /empty|whitespace|No extractable text/i);

    const source = await KnowledgeSource.findById(sourceId);
    assert.equal(source.status, "FAILED");
    assert.ok(source.errorMessage);
  });

  test("F. Corrupted Document: handles extraction failure and marks FAILED", async () => {
    const formData = new FormData();
    formData.append("file", new Blob([Buffer.from("INVALID_DATA")], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "corrupt.docx");
    formData.append("title", "Corrupt DOCX");

    const uploadRes = await request("/knowledge/upload", {
      method: "POST",
      cookies: userACookies,
      body: formData,
    });

    const sourceId = uploadRes.body.data.knowledgeSource.id;

    const processRes = await request(`/knowledge/${sourceId}/process`, {
      method: "POST",
      cookies: userACookies,
    });

    assert.equal(processRes.status, 400);

    const source = await KnowledgeSource.findById(sourceId);
    assert.equal(source.status, "FAILED");
  });

  test("G. Unsupported File Type: rejected with 400 at upload", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["binary"], { type: "application/x-msdownload" }), "malicious.exe");

    const uploadRes = await request("/knowledge/upload", {
      method: "POST",
      cookies: userACookies,
      body: formData,
    });

    assert.equal(uploadRes.status, 400);
  });

  test("H. Unauthorized Request: unauthenticated user receives 401", async () => {
    const res = await request("/knowledge/60c72b2f9b1d8b0015f89999/process", {
      method: "POST",
    });

    assert.equal(res.status, 401);
  });

  test("I. Ownership Protection: User B cannot process or access chunks of User A's source", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["User A confidential notes"], { type: "text/plain" }), "user_a_private.txt");
    formData.append("title", "User A Private");

    const uploadRes = await request("/knowledge/upload", {
      method: "POST",
      cookies: userACookies,
      body: formData,
    });

    const sourceId = uploadRes.body.data.knowledgeSource.id;

    // User B tries to trigger processing on User A's document
    const unauthorizedProcess = await request(`/knowledge/${sourceId}/process`, {
      method: "POST",
      cookies: userBCookies,
    });

    assert.equal(unauthorizedProcess.status, 404);

    // User B tries to view chunks of User A's document
    const unauthorizedChunks = await request(`/knowledge/${sourceId}/chunks`, {
      cookies: userBCookies,
    });

    assert.equal(unauthorizedChunks.status, 404);
  });

  test("J. Reprocessing Safety: multiple process calls do not produce duplicate chunks", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["Reprocessing paragraph 1.\n\nReprocessing paragraph 2."], { type: "text/plain" }), "reprocess.txt");
    formData.append("title", "Reprocess Test");

    const uploadRes = await request("/knowledge/upload", {
      method: "POST",
      cookies: userACookies,
      body: formData,
    });

    const sourceId = uploadRes.body.data.knowledgeSource.id;

    // First process
    const res1 = await request(`/knowledge/${sourceId}/process`, {
      method: "POST",
      cookies: userACookies,
    });
    assert.equal(res1.status, 200);
    const count1 = res1.body.data.chunkCount;

    // Second process (Reprocessing)
    const res2 = await request(`/knowledge/${sourceId}/process`, {
      method: "POST",
      cookies: userACookies,
    });
    assert.equal(res2.status, 200);
    const count2 = res2.body.data.chunkCount;

    // Verify database chunk count
    const dbChunks = await KnowledgeChunk.find({ knowledgeSourceId: sourceId });
    assert.equal(dbChunks.length, count2);
    assert.equal(count1, count2);
  });
});
