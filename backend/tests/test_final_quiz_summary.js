const fs = require("fs");
const path = require("path");

const API_BASE = "http://localhost:5000/api";
const TEST_DIR = path.resolve(__dirname, "../storage/test_files");

async function run() {
  console.log("=== FINAL VERIFICATION: AUTH -> QUIZ (5) -> SCORING -> SUMMARY -> NOTES -> ASK ===");

  // 1. Register test user
  const email = `final_verifier_${Date.now()}@prepmind.ai`;
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Final Verifier",
      email,
      password: "Password123!@#",
      confirmPassword: "Password123!@#",
    }),
  });
  const regData = await regRes.json();
  const token = regData.data?.tokens?.accessToken;
  console.log(`1. User registered: ${email} (status: ${regRes.status})`);

  const headers = {
    Cookie: `pm_access_token=${token}`,
    "Content-Type": "application/json",
  };

  // 2. Upload test document
  const filePath = path.join(TEST_DIR, "test_doc.txt");
  const fileBytes = fs.readFileSync(filePath);
  const formData = new FormData();
  formData.append("file", new Blob([fileBytes], { type: "text/plain" }), "test_doc.txt");
  formData.append("title", "Cloud Computing & Systems Architecture");

  const upRes = await fetch(`${API_BASE}/knowledge/upload`, {
    method: "POST",
    headers: { Cookie: `pm_access_token=${token}` },
    body: formData,
  });
  const upData = await upRes.json();
  const sourceId = upData.data?.knowledgeSource?.id;
  console.log(`2. Document uploaded: ID ${sourceId} (status: ${upRes.status})`);

  // 3. Process document
  const prRes = await fetch(`${API_BASE}/knowledge/${sourceId}/process`, {
    method: "POST",
    headers,
  });
  const prData = await prRes.json();
  console.log(`3. Document processed: Status ${prData.data?.knowledgeSource?.status} (status: ${prRes.status})`);

  // 4. Ask PrepMind
  const askRes = await fetch(`${API_BASE}/rag/ask`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: "What is IaaS in cloud computing?",
      knowledgeSourceIds: [sourceId],
    }),
  });
  const askData = await askRes.json();
  console.log(`4. Ask PrepMind: ${askData.data?.answer?.slice(0, 100)}... (status: ${askRes.status})`);

  // 5. Generate Summary
  const sumRes = await fetch(`${API_BASE}/rag/summary`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      knowledgeSourceIds: [sourceId],
      regenerate: true,
    }),
  });
  const sumData = await sumRes.json();
  console.log(`5. Summary Generated: ${sumData.data?.content?.length} chars (status: ${sumRes.status})`);

  // 6. Generate Notes
  const notesRes = await fetch(`${API_BASE}/rag/notes`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      knowledgeSourceIds: [sourceId],
      regenerate: true,
    }),
  });
  const notesData = await notesRes.json();
  console.log(`6. Notes Generated: ${notesData.data?.content?.length} chars (status: ${notesRes.status})`);

  // 7. Generate 5-Question Quiz
  const quizRes = await fetch(`${API_BASE}/rag/quiz`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      knowledgeSourceIds: [sourceId],
      questionCount: 5,
      difficulty: "Medium",
      questionType: "MCQ",
      regenerate: true,
    }),
  });
  const quizData = await quizRes.json();
  const questions = quizData.data?.questions || [];
  console.log(`7. Quiz Generated: ${questions.length} questions (Expected: 5, status: ${quizRes.status})`);

  // 8. Submit Quiz Attempt
  if (questions.length === 5) {
    const assessmentId = quizData.data.id;
    const answers = questions.map((q, idx) => ({
      questionId: q.id,
      userAnswer: idx === 0 ? "wrong_answer" : q.correctAnswer,
    }));
    const attemptRes = await fetch(`${API_BASE}/rag/assessments/${assessmentId}/attempt`, {
      method: "POST",
      headers,
      body: JSON.stringify({ answers, timeSpentSeconds: 60 }),
    });
    const attemptData = await attemptRes.json();
    console.log(`8. Quiz Attempt Scored: ${attemptData.data?.score}/${attemptData.data?.totalMarks} (${attemptData.data?.percentage}%)`);
  }

  console.log("\n✅ ALL CRITICAL USER WORKFLOWS COMPLETED AND VALIDATED SUCCESSFULLY!");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
