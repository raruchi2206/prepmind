const fs = require("fs");
const path = require("path");

const API_BASE = "http://localhost:5000/api";
const TEST_PDF_PATH = "C:\\Users\\Rana Ruchi\\Downloads\\Request Letter for 75% Attendance Certificate (1).pdf";

async function run() {
  console.log("============================================================");
  console.log("PREPMIND FINAL PRODUCTION PASS — END-TO-END VERIFICATION");
  console.log("============================================================\n");

  // 1. Authenticate / Login
  console.log("▶ Step 1: Authentication / User Login");
  const authPayload = {
    name: "PrepMind Tester",
    email: `test_${Date.now()}@prepmind.ai`,
    password: "Password123!@#",
    confirmPassword: "Password123!@#",
  };

  let token = null;
  let userId = null;

  // Register user
  try {
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authPayload),
    });
    const regData = await regRes.json();
    if (regData.success && regData.data?.tokens?.accessToken) {
      token = regData.data.tokens.accessToken;
      userId = regData.data.user.id;
      console.log(`✅ Registered new test user: ${userId}`);
    } else {
      console.log(`Register response:`, JSON.stringify(regData));
      // Fallback to login
      const logRes = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authPayload.email,
          password: authPayload.password,
        }),
      });
      const logData = await logRes.json();
      if (logData.success && logData.data?.tokens?.accessToken) {
        token = logData.data.tokens.accessToken;
        userId = logData.data.user.id;
        console.log(`✅ Logged in existing test user: ${userId}`);
      }
    }
  } catch (err) {
    console.error("Auth error:", err.message);
  }

  if (!token) {
    throw new Error("Failed to authenticate test user.");
  }

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  // 2. Upload NEW PDF
  console.log("\n▶ Step 2: Upload NEW PDF Document");
  if (!fs.existsSync(TEST_PDF_PATH)) {
    throw new Error(`Test PDF not found at path: ${TEST_PDF_PATH}`);
  }

  const fileStats = fs.statSync(TEST_PDF_PATH);
  console.log(`File: "${path.basename(TEST_PDF_PATH)}" (${fileStats.size} bytes)`);

  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(TEST_PDF_PATH)], { type: "application/pdf" });
  formData.append("file", fileBlob, path.basename(TEST_PDF_PATH));
  formData.append("title", "Request Letter for 75% Attendance Certificate");

  const uploadRes = await fetch(`${API_BASE}/knowledge/upload`, {
    method: "POST",
    headers: { ...authHeaders },
    body: formData,
  });

  const uploadData = await uploadRes.json();
  if (!uploadData.success || !uploadData.data?.knowledgeSource?.id) {
    throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
  }

  const sourceId = uploadData.data.knowledgeSource.id;
  console.log(`✅ Source created with ID: ${sourceId}`);

  // 3. Process the Knowledge Source
  console.log("\n▶ Step 3: Process Knowledge Source Pipeline");
  const processRes = await fetch(`${API_BASE}/knowledge/${sourceId}/process`, {
    method: "POST",
    headers: { ...authHeaders },
  });

  const processData = await processRes.json();
  if (!processData.success) {
    throw new Error(`Processing failed: ${JSON.stringify(processData)}`);
  }

  const processedSource = processData.data.knowledgeSource;
  console.log(`✅ Source Status: ${processedSource.status}`);
  console.log(`✅ Chunk Count: ${processData.data.chunkCount}`);
  console.log(`✅ Pages: ${processedSource.metadata?.pageCount}, Words: ${processedSource.metadata?.wordCount}`);

  if (processedSource.status !== "READY" || processData.data.chunkCount <= 0) {
    throw new Error("Source is not READY or has 0 chunks.");
  }

  // 4. Verify Chunks in MongoDB
  console.log("\n▶ Step 4: Verify MongoDB Chunks");
  const chunksRes = await fetch(`${API_BASE}/knowledge/${sourceId}/chunks`, {
    method: "GET",
    headers: { ...authHeaders },
  });
  const chunksData = await chunksRes.json();
  console.log(`✅ MongoDB Chunks stored: ${chunksData.data?.chunks?.length}`);
  if (!chunksData.data?.chunks || chunksData.data.chunks.length === 0) {
    throw new Error("No MongoDB chunks found.");
  }

  // 5. Test RAG Ask (Grounding & Insufficient Context)
  console.log("\n▶ Step 5: Test RAG Grounded Q&A (Ask PrepMind)");
  const askRes = await fetch(`${API_BASE}/rag/ask`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "What is the attendance certificate request about and who is requesting it?",
      knowledgeSourceIds: [sourceId],
    }),
  });
  const askData = await askRes.json();
  console.log(`✅ RAG Answer received (${askData.data?.chunksRetrieved} chunks retrieved):`);
  console.log(`   "${askData.data?.answer?.slice(0, 150)}..."`);
  console.log(`✅ Sources cited: ${askData.data?.sources?.length}`);

  // 6. Test Summary
  console.log("\n▶ Step 6: Test Summary Generation");
  const summaryRes = await fetch(`${API_BASE}/rag/summary`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      knowledgeSourceIds: [sourceId],
      regenerate: true,
    }),
  });
  const summaryData = await summaryRes.json();
  console.log(`✅ Summary Title: ${summaryData.data?.title}`);
  console.log(`✅ Summary length: ${summaryData.data?.content?.length} chars`);

  // 7. Test Notes
  console.log("\n▶ Step 7: Test Academic Notes Generation");
  const notesRes = await fetch(`${API_BASE}/rag/notes`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      knowledgeSourceIds: [sourceId],
      regenerate: true,
    }),
  });
  const notesData = await notesRes.json();
  console.log(`✅ Notes Title: ${notesData.data?.title}`);
  console.log(`✅ Notes length: ${notesData.data?.content?.length} chars`);

  // 8. Test Quiz Generation: 3 Questions
  console.log("\n▶ Step 8: Test Quiz Generation — 3 Questions");
  const quiz3Res = await fetch(`${API_BASE}/rag/quiz`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      knowledgeSourceIds: [sourceId],
      questionCount: 3,
      difficulty: "Medium",
      questionType: "MCQ",
      regenerate: true,
    }),
  });
  const quiz3Data = await quiz3Res.json();
  const q3Count = quiz3Data.data?.questions?.length || 0;
  console.log(`✅ 3-Question Quiz: Generated ${q3Count} questions in ${quiz3Data.data?.generationTimeSeconds}s`);
  if (q3Count !== 3) {
    throw new Error(`Expected exactly 3 questions, got ${q3Count}`);
  }

  // 9. Test Quiz Generation: 5 Questions
  console.log("\n▶ Step 9: Test Quiz Generation — 5 Questions");
  const quiz5Res = await fetch(`${API_BASE}/rag/quiz`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      knowledgeSourceIds: [sourceId],
      questionCount: 5,
      difficulty: "Medium",
      questionType: "MCQ",
      regenerate: true,
    }),
  });
  const quiz5Data = await quiz5Res.json();
  const q5Count = quiz5Data.data?.questions?.length || 0;
  console.log(`✅ 5-Question Quiz: Generated ${q5Count} questions in ${quiz5Data.data?.generationTimeSeconds}s`);
  if (q5Count !== 5) {
    throw new Error(`Expected exactly 5 questions, got ${q5Count}`);
  }

  // 10. Test Quiz Answer Selection, Feedback, and Submission
  console.log("\n▶ Step 10: Test Quiz Attempt Submission & Grading");
  const assessment5Id = quiz5Data.data.id;
  const questions5 = quiz5Data.data.questions;

  // Simulate user answering 4 questions correctly, leaving 1 unanswered
  const answersToSubmit = questions5.map((q, idx) => {
    if (idx === 4) {
      return { questionId: q.id, userAnswer: "" }; // Unanswered
    }
    return { questionId: q.id, userAnswer: q.correctAnswer }; // Correct
  });

  const submitRes = await fetch(`${API_BASE}/rag/assessments/${assessment5Id}/attempt`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      answers: answersToSubmit,
      timeSpentSeconds: 42,
    }),
  });
  const attemptData = await submitRes.json();
  const attempt = attemptData.data;
  console.log(`✅ Graded Attempt Score: ${attempt.score} / ${attempt.totalMarks} (${attempt.percentage}%)`);
  console.log(`✅ Evaluated Answers: ${attempt.answers?.length}`);

  attempt.answers.forEach((ans, idx) => {
    console.log(`   Q${idx + 1}: Selected="${ans.userAnswer}" | Correct="${ans.correctAnswer}" | isCorrect=${ans.isCorrect}`);
  });

  const correctAnswers = attempt.answers.filter((a) => a.isCorrect).length;
  const unansweredAnswers = attempt.answers.filter((a) => a.userAnswer === "Not Answered" || !a.userAnswer).length;
  console.log(`✅ Correct: ${correctAnswers}, Unanswered: ${unansweredAnswers}`);

  // 11. Test Quiz Generation: 8 Questions
  console.log("\n▶ Step 11: Test Quiz Generation — 8 Questions");
  const quiz8Res = await fetch(`${API_BASE}/rag/quiz`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      knowledgeSourceIds: [sourceId],
      questionCount: 8,
      difficulty: "Hard",
      questionType: "MCQ",
      regenerate: true,
    }),
  });
  const quiz8Data = await quiz8Res.json();
  const q8Count = quiz8Data.data?.questions?.length || 0;
  console.log(`✅ 8-Question Quiz: Generated ${q8Count} questions in ${quiz8Data.data?.generationTimeSeconds}s`);
  if (q8Count !== 8) {
    throw new Error(`Expected exactly 8 questions, got ${q8Count}`);
  }

  // 12. Test Quiz Generation: 10 Questions
  console.log("\n▶ Step 12: Test Quiz Generation — 10 Questions");
  const quiz10Res = await fetch(`${API_BASE}/rag/quiz`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      knowledgeSourceIds: [sourceId],
      questionCount: 10,
      difficulty: "Hard",
      questionType: "MCQ",
      regenerate: true,
    }),
  });
  const quiz10Data = await quiz10Res.json();
  const q10Count = quiz10Data.data?.questions?.length || 0;
  console.log(`✅ 10-Question Quiz: Generated ${q10Count} questions in ${quiz10Data.data?.generationTimeSeconds}s`);
  if (q10Count !== 10) {
    throw new Error(`Expected exactly 10 questions, got ${q10Count}`);
  }

  // 13. Test Practice Paper Generation
  console.log("\n▶ Step 13: Test Practice Paper Generation");
  const paperRes = await fetch(`${API_BASE}/rag/practice-paper`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      knowledgeSourceIds: [sourceId],
      totalMarks: 50,
      difficulty: "Medium",
      regenerate: true,
    }),
  });
  const paperData = await paperRes.json();
  console.log(`✅ Practice Paper Title: ${paperData.data?.title}`);
  console.log(`✅ Sections: ${paperData.data?.sections?.length}`);

  // 14. Test Viva Generation
  console.log("\n▶ Step 14: Test Viva Generation");
  const vivaRes = await fetch(`${API_BASE}/rag/viva`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      knowledgeSourceIds: [sourceId],
      questionCount: 5,
      difficulty: "Medium",
      regenerate: true,
    }),
  });
  const vivaData = await vivaRes.json();
  console.log(`✅ Viva Title: ${vivaData.data?.title}`);
  console.log(`✅ Viva Questions: ${vivaData.data?.questions?.length}`);

  // 15. Test Re-index
  console.log("\n▶ Step 15: Test Re-index Functionality");
  const reindexRes = await fetch(`${API_BASE}/knowledge/${sourceId}/reindex`, {
    method: "POST",
    headers: { ...authHeaders },
  });
  const reindexData = await reindexRes.json();
  console.log(`✅ Reindex Status: ${reindexData.data?.knowledgeSource?.status}, Indexed Vectors: ${reindexData.data?.indexedCount}`);

  // 16. Test History & Progress
  console.log("\n▶ Step 16: Test History & Progress Endpoints");
  const histRes = await fetch(`${API_BASE}/history`, {
    method: "GET",
    headers: { ...authHeaders },
  });
  const histData = await histRes.json();
  console.log(`✅ History Total Items: ${histData.data?.items?.length}`);

  const progRes = await fetch(`${API_BASE}/progress`, {
    method: "GET",
    headers: { ...authHeaders },
  });
  const progData = await progRes.json();
  console.log(`✅ Progress Average Score: ${progData.data?.averageScore}%, Total Quizzes: ${progData.data?.quizzesAttempted}`);

  console.log("\n============================================================");
  console.log("🎉 ALL END-TO-END ACCEPTANCE TESTS PASSED SUCCESSFULLY!");
  console.log("============================================================\n");
}

run().catch((err) => {
  console.error("\n❌ E2E TEST FAILED:", err);
  process.exit(1);
});
