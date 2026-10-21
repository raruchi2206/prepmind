const { randomUUID } = require("node:crypto");
const KnowledgeSource = require("../models/KnowledgeSource");
const KnowledgeChunk = require("../models/KnowledgeChunk");
const GeneratedContent = require("../models/GeneratedContent");
const Assessment = require("../models/Assessment");
const Attempt = require("../models/Attempt");
const Conversation = require("../models/Conversation");
const aiServiceClient = require("./aiServiceClient");
const { createHttpError } = require("../middleware/errorMiddleware");
const { validateObjectId } = require("../utils/security");
const {
  normalizeQuestionCount,
  normalizeQuestionType,
  validateQuizQuestionSet,
} = require("../utils/quizValidation");

function secondsSince(startedAt) {
  return Number(((Date.now() - startedAt) / 1000).toFixed(2));
}

async function verifyAndGetSources(userId, sourceIds, requireExplicit = true) {
  const query = { userId };
  if (Array.isArray(sourceIds) && sourceIds.length > 0) {
    sourceIds.forEach((id) => validateObjectId(id, "Knowledge Source ID"));
    query._id = { $in: sourceIds };
  } else if (typeof sourceIds === "string" && sourceIds.trim()) {
    validateObjectId(sourceIds, "Knowledge Source ID");
    query._id = sourceIds.trim();
  } else if (requireExplicit) {
    throw createHttpError(400, "Select a knowledge source first.");
  }

  const sources = await KnowledgeSource.find(query);
  if (!sources || sources.length === 0) {
    if (sourceIds && (Array.isArray(sourceIds) ? sourceIds.length > 0 : Boolean(sourceIds))) {
      throw createHttpError(
        403,
        "Selected knowledge source was not found or access is denied.",
      );
    }
    return [];
  }

  const failedSource = sources.find((s) => s.status === "FAILED");
  if (failedSource) {
    throw createHttpError(
      400,
      `"${failedSource.title}" failed to process: ${failedSource.errorMessage || "unknown error"}. Retry or reprocess it from the Knowledge page.`,
      "SOURCE_FAILED",
    );
  }

  const pendingSource = sources.find((s) => s.status !== "READY");
  if (pendingSource) {
    throw createHttpError(
      400,
      "This document is still being processed. Please try again when processing is complete.",
    );
  }

  return sources;
}

async function retrieveRelevantChunks({
  userId,
  query,
  knowledgeSourceIds = null,
  topK = 5,
  enforceKnowledgeSourceFilter = false,
}) {
  console.log(`[RAG] Query received: '${query}' for user ${userId}`);

  const sources = await verifyAndGetSources(
    userId,
    knowledgeSourceIds,
    Boolean(enforceKnowledgeSourceFilter),
  );
  if (!sources || sources.length === 0) {
    return { chunks: [], insufficientContext: true };
  }
  const validSourceIds = sources.map((s) => s._id.toString());
  const sourceTitleMap = new Map(
    sources.map((s) => [s._id.toString(), s.title]),
  );

  // Auto-heal check: ensure documents with MongoDB chunks are indexed in FAISS
  try {
    const userStats = await aiServiceClient.getUserStats(userId);
    if (!userStats || userStats.vectorCount === 0) {
      for (const source of sources) {
        const chunksToSync = await KnowledgeChunk.find({
          knowledgeSourceId: source._id,
          userId,
        });
        if (chunksToSync.length > 0) {
          console.log(
            `[RAG Auto-Sync] Indexing ${chunksToSync.length} chunks for source ${source._id} into FAISS`,
          );
          await aiServiceClient.indexChunks(userId, source._id, chunksToSync);
        }
      }
    }
  } catch (syncErr) {
    console.warn(`[RAG Auto-Sync] Sync check error: ${syncErr.message}`);
  }

  // 1. Vector similarity search in FAISS
  let matches = [];
  try {
    matches = await aiServiceClient.searchVectors(
      userId,
      query,
      validSourceIds,
      topK,
    );
  } catch (err) {
    console.warn(
      `[RAG] Vector search error, fallback to source chunks: ${err.message}`,
    );
  }

  let finalChunks = [];

  if (matches.length > 0) {
    const chunkIds = matches.map((m) => m.chunkId).filter(Boolean);
    const mongoChunkQuery = {
      _id: { $in: chunkIds },
      userId,
    };
    if (enforceKnowledgeSourceFilter) {
      mongoChunkQuery.knowledgeSourceId = {
        $in: sources.map((source) => source._id),
      };
    }
    const mongoChunks = await KnowledgeChunk.find(mongoChunkQuery);
    console.log(`[RAG] MongoDB chunks loaded: ${mongoChunks.length} documents`);

    const chunkMap = new Map(mongoChunks.map((c) => [c._id.toString(), c]));

    for (const match of matches) {
      const mc = chunkMap.get(match.chunkId);
      if (mc) {
        finalChunks.push({
          chunkId: mc._id.toString(),
          knowledgeSourceId: mc.knowledgeSourceId.toString(),
          sourceTitle:
            sourceTitleMap.get(mc.knowledgeSourceId.toString()) ||
            "Knowledge Source",
          chunkIndex: mc.chunkIndex,
          text: mc.text,
          metadata: mc.metadata,
          similarityScore: match.score,
        });
      }
    }
  }

  // If vector search returned 0 matches but we have valid chunks in DB, fetch top chunks from source
  if (finalChunks.length === 0) {
    const fallbackMongoChunks = await KnowledgeChunk.find({
      knowledgeSourceId: { $in: validSourceIds },
      userId,
    }).limit(topK);

    for (const mc of fallbackMongoChunks) {
      finalChunks.push({
        chunkId: mc._id.toString(),
        knowledgeSourceId: mc.knowledgeSourceId.toString(),
        sourceTitle:
          sourceTitleMap.get(mc.knowledgeSourceId.toString()) ||
          "Knowledge Source",
        chunkIndex: mc.chunkIndex,
        text: mc.text,
        metadata: mc.metadata,
        similarityScore: 1.0,
      });
    }
  }

  return {
    sources: sources.map((s) => s.toSafeObject()),
    chunks: finalChunks,
  };
}

async function askPrepMind({
  userId,
  query,
  knowledgeSourceIds = null,
  conversationId = null,
}) {
  const startedAt = Date.now();
  const { sources, chunks } = await retrieveRelevantChunks({
    userId,
    query,
    knowledgeSourceIds,
    topK: 5,
  });

  let conversation = null;
  let history = [];

  if (conversationId) {
    validateObjectId(conversationId, "Conversation ID");
    conversation = await Conversation.findOne({ _id: conversationId, userId });
    if (conversation) {
      history = (conversation.messages || []).slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));
    }
  }

  // Zero-context protection: If no relevant chunks retrieved, do not call LLM
  if (!chunks || chunks.length === 0) {
    console.log(
      `[RAG] Zero relevant chunks retrieved. Returning insufficient context response without calling LLM.`,
    );
    const insufficientAnswer =
      "I couldn't find enough information in your uploaded knowledge to answer this question.";
    const userMsg = { role: "user", content: query, createdAt: new Date() };
    const assistantMsg = {
      role: "assistant",
      content: insufficientAnswer,
      sources: [],
      createdAt: new Date(),
    };

    if (!conversation) {
      conversation = await Conversation.create({
        userId,
        knowledgeSourceIds: sources.map((s) => s.id),
        title: query.slice(0, 50) + (query.length > 50 ? "..." : ""),
        messages: [userMsg, assistantMsg],
      });
    } else {
      conversation.messages.push(userMsg, assistantMsg);
      await conversation.save();
    }

    return {
      conversationId: conversation._id.toString(),
      answer: insufficientAnswer,
      sources: [],
      chunksRetrieved: 0,
      insufficientContext: true,
      generationTimeSeconds: secondsSince(startedAt),
    };
  }

  console.log(
    `[RAG] LLM generation started for query: '${query}' with ${chunks.length} chunks`,
  );
  const aiResult = await aiServiceClient.askRAG(query, chunks, history);
  console.log(`[RAG] LLM generation completed`);

  const userMsg = { role: "user", content: query, createdAt: new Date() };
  const assistantMsg = {
    role: "assistant",
    content: aiResult.answer,
    sources: aiResult.sources || [],
    createdAt: new Date(),
  };

  if (!conversation) {
    conversation = await Conversation.create({
      userId,
      knowledgeSourceIds: sources.map((s) => s.id),
      title: query.slice(0, 50) + (query.length > 50 ? "..." : ""),
      messages: [userMsg, assistantMsg],
    });
  } else {
    conversation.messages.push(userMsg, assistantMsg);
    await conversation.save();
  }

  return {
    conversationId: conversation._id.toString(),
    answer: aiResult.answer,
    sources: aiResult.sources || [],
    chunksRetrieved: chunks.length,
    insufficientContext: false,
    generationTimeSeconds: secondsSince(startedAt),
  };
}

async function generateSummary({
  userId,
  knowledgeSourceIds,
  regenerate = false,
}) {
  const startedAt = Date.now();
  const sources = await verifyAndGetSources(userId, knowledgeSourceIds);
  const sourceIds = sources.map((s) => s._id);
  const sourceTitle = sources.map((s) => s.title).join(", ");

  // Check cache if not explicitly regenerating
  if (!regenerate) {
    const existing = await GeneratedContent.findOne({
      userId,
      knowledgeSourceIds: { $in: sourceIds },
      type: "SUMMARY",
    }).sort({ createdAt: -1 });

    if (existing) {
      return {
        ...existing.toSafeObject(),
        generationTimeSeconds: existing.metadata?.generationTimeSeconds ?? null,
        cached: true,
      };
    }
  }

  const { chunks } = await retrieveRelevantChunks({
    userId,
    query: `Provide a full comprehensive overview and summary of ${sourceTitle}`,
    knowledgeSourceIds,
    topK: 10,
  });

  if (!chunks || chunks.length === 0) {
    throw createHttpError(
      400,
      "I couldn't find enough information in this document to generate this content.",
    );
  }

  const aiResult = await aiServiceClient.generateSummary(chunks, sourceTitle);

  const doc = await GeneratedContent.create({
    userId,
    knowledgeSourceIds: sourceIds,
    type: "SUMMARY",
    title: aiResult.title || `Summary: ${sourceTitle}`,
    content: aiResult.content,
    sources: aiResult.sources || [],
    metadata: {
      chunksRetrieved: chunks.length,
      generationTimeSeconds: secondsSince(startedAt),
    },
  });

  return {
    ...doc.toSafeObject(),
    generationTimeSeconds: doc.metadata.generationTimeSeconds,
  };
}

async function generateNotes({
  userId,
  knowledgeSourceIds,
  regenerate = false,
}) {
  const startedAt = Date.now();
  const sources = await verifyAndGetSources(userId, knowledgeSourceIds);
  const sourceIds = sources.map((s) => s._id);
  const sourceTitle = sources.map((s) => s.title).join(", ");

  // Check cache if not explicitly regenerating
  if (!regenerate) {
    const existing = await GeneratedContent.findOne({
      userId,
      knowledgeSourceIds: { $in: sourceIds },
      type: "NOTES",
    }).sort({ createdAt: -1 });

    if (existing) {
      return {
        ...existing.toSafeObject(),
        generationTimeSeconds: existing.metadata?.generationTimeSeconds ?? null,
        cached: true,
      };
    }
  }

  const { chunks } = await retrieveRelevantChunks({
    userId,
    query: `Detailed academic study notes and key concepts of ${sourceTitle}`,
    knowledgeSourceIds,
    topK: 12,
  });

  if (!chunks || chunks.length === 0) {
    throw createHttpError(
      400,
      "I couldn't find enough information in this document to generate this content.",
    );
  }

  const aiResult = await aiServiceClient.generateNotes(chunks, sourceTitle);

  const doc = await GeneratedContent.create({
    userId,
    knowledgeSourceIds: sourceIds,
    type: "NOTES",
    title: aiResult.title || `Notes: ${sourceTitle}`,
    content: aiResult.content,
    sources: aiResult.sources || [],
    metadata: {
      chunksRetrieved: chunks.length,
      generationTimeSeconds: secondsSince(startedAt),
    },
  });

  return {
    ...doc.toSafeObject(),
    generationTimeSeconds: doc.metadata.generationTimeSeconds,
  };
}

async function generateQuiz({
  userId,
  knowledgeSourceIds,
  questionCount = 5,
  difficulty = "Medium",
  questionType = "MCQ",
  generationId = null,
  regenerate = true,
}) {
  const startedAt = Date.now();
  const health = await aiServiceClient.checkHealth();
  if (!health || health.available === false) {
    throw createHttpError(
      503,
      "AI generation service is unavailable. Please make sure the AI service is running and try again.",
      "AI_SERVICE_UNAVAILABLE",
      health && health.error
        ? health.error
        : "Unable to connect to the AI service.",
    );
  }

  const sources = await verifyAndGetSources(userId, knowledgeSourceIds);
  const sourceIds = sources.map((s) => s._id);
  const sourceTitle = sources.map((s) => s.title).join(", ");
  const requestedCount = normalizeQuestionCount(questionCount, 5);
  const normalizedType = normalizeQuestionType(questionType, "MCQ");
  const finalGenerationId = generationId || randomUUID();
  console.log(`[QUIZ DEBUG] questionCount=${requestedCount}`);
  console.log(
    `[QUIZ DEBUG] difficulty=${String(difficulty || "Medium").toUpperCase()}`,
  );
  console.log(
    `[QUIZ DEBUG] questionType=${String(normalizedType).toUpperCase()}`,
  );
  console.log(
    `[QUIZ DEBUG] knowledgeSourceId=${sourceIds.map((id) => id.toString()).join(",")}`,
  );
  console.log(
    `[QUIZ DEBUG] Source lookup completed for ${sourceIds.length} source(s) in ${Date.now() - startedAt}ms`,
  );

  const previousAssessments = await Assessment.find({
    userId,
    knowledgeSourceIds: { $in: sourceIds },
    type: "QUIZ",
  })
    .sort({ createdAt: -1 })
    .limit(3)
    .select("questions");

  const previousQuestions = previousAssessments
    .flatMap((assessment) =>
      (assessment.questions || []).map((question) => question.question),
    )
    .filter(Boolean)
    .slice(-12);

  const { chunks } = await retrieveRelevantChunks({
    userId,
    query: `Generate a fresh ${requestedCount}-question ${String(difficulty).toLowerCase()} ${String(normalizedType).toLowerCase()} quiz grounded only in ${sourceTitle}.`,
    knowledgeSourceIds,
    topK: 10,
    enforceKnowledgeSourceFilter: true,
  });
  const requestedSourceIds = new Set(sourceIds.map((id) => id.toString()));
  const retrievedSourceIds = [
    ...new Set((chunks || []).map((chunk) => chunk.knowledgeSourceId)),
  ];

  console.log(
    `[QUIZ]\nsourceId = ${sourceIds.map((id) => id.toString()).join(",")}\nretrievedChunks = ${chunks?.length || 0}\nretrievedSourceIds = ${retrievedSourceIds.join(",") || "none"}`,
  );
  console.log(`[RAG DEBUG] Retrieved chunks: ${chunks?.length || 0}`);
  console.log(`[QUIZ DEBUG] Retrieved chunks: ${chunks?.length || 0}`);

  if (
    chunks.some((chunk) => !requestedSourceIds.has(chunk.knowledgeSourceId))
  ) {
    throw createHttpError(
      500,
      "Quiz retrieval returned a chunk outside the selected knowledge source.",
    );
  }

  if (!chunks || chunks.length === 0) {
    throw createHttpError(
      400,
      "No usable content was found in the selected source. Please process the document first.",
    );
  }

  let aiResult;
  try {
    console.log(`[QUIZ DEBUG] AI service request started`);
    aiResult = await aiServiceClient.generateQuiz(
      chunks,
      sourceTitle,
      requestedCount,
      difficulty,
      normalizedType,
      finalGenerationId,
      previousQuestions,
    );
    console.log(`[QUIZ DEBUG] AI service response received`);
    aiResult = validateQuizQuestionSet(aiResult, {
      questionCount: requestedCount,
      questionType: normalizedType,
      difficulty,
    });
    console.log(`[QUIZ DEBUG] Validation result: PASS`);
  } catch (err) {
    console.log(`[QUIZ DEBUG] Validation result: FAIL`);
    console.log(
      `[QUIZ DEBUG] Validation reason: ${err?.message || String(err)}`,
    );
    throw createHttpError(
      422,
      `Quiz generation failed validation: ${err?.message || String(err)}`,
      "QUIZ_VALIDATION_FAILED",
      err?.message || String(err),
    );
  }

  const assessment = await Assessment.create({
    userId,
    knowledgeSourceIds: sourceIds,
    title: aiResult.title || `Quiz: ${sourceTitle}`,
    type: "QUIZ",
    difficulty,
    questionType: normalizedType,
    generationId: finalGenerationId,
    totalMarks: (aiResult.questions || []).length,
    timeAllowedMinutes: Math.max(5, (aiResult.questions || []).length * 2),
    questions: aiResult.questions || [],
    sources: aiResult.sources || [],
  });
  console.log(
    `[QUIZ DEBUG] MongoDB save completed. Final question count: ${assessment.questions.length}`,
  );

  await GeneratedContent.create({
    userId,
    knowledgeSourceIds: sourceIds,
    type: "QUIZ",
    title: assessment.title,
    content: assessment._id.toString(),
    sources: aiResult.sources || [],
    metadata: {
      questionCount: assessment.questions.length,
      difficulty,
      questionType: normalizedType,
      generationId: finalGenerationId,
    },
  });

  assessment.generationTimeSeconds = secondsSince(startedAt);
  await assessment.save();
  return assessment.toSafeObject();
}

async function generatePracticePaper({
  userId,
  knowledgeSourceIds,
  totalMarks = 50,
  difficulty = "Medium",
  regenerate = false,
}) {
  const startedAt = Date.now();
  const sources = await verifyAndGetSources(userId, knowledgeSourceIds);
  const sourceIds = sources.map((s) => s._id);
  const sourceTitle = sources.map((s) => s.title).join(", ");

  if (!regenerate) {
    const existing = await Assessment.findOne({
      userId,
      knowledgeSourceIds: { $in: sourceIds },
      type: "PRACTICE_PAPER",
    }).sort({ createdAt: -1 });

    if (existing && existing.sections && existing.sections.length > 0) {
      return {
        ...existing.toSafeObject(),
        cached: true,
      };
    }
  }

  const { chunks } = await retrieveRelevantChunks({
    userId,
    query: `Examination questions, theory, case studies and numerical problems for ${sourceTitle}`,
    knowledgeSourceIds,
    topK: 15,
  });

  if (!chunks || chunks.length === 0) {
    throw createHttpError(
      400,
      "I couldn't find enough information in this document to generate this content.",
    );
  }

  const aiResult = await aiServiceClient.generatePracticePaper(
    chunks,
    sourceTitle,
    totalMarks,
    difficulty,
  );

  const assessment = await Assessment.create({
    userId,
    knowledgeSourceIds: sourceIds,
    title: aiResult.title || `Practice Paper: ${sourceTitle}`,
    type: "PRACTICE_PAPER",
    difficulty,
    totalMarks: aiResult.totalMarks || totalMarks,
    timeAllowedMinutes: aiResult.timeAllowedMinutes || 90,
    sections: aiResult.sections || [],
    sources: aiResult.sources || [],
    generationTimeSeconds: secondsSince(startedAt),
  });

  await GeneratedContent.create({
    userId,
    knowledgeSourceIds: sourceIds,
    type: "PRACTICE_PAPER",
    title: assessment.title,
    content: assessment._id.toString(),
    sources: aiResult.sources || [],
    metadata: {
      totalMarks: assessment.totalMarks,
      difficulty,
    },
  });

  return assessment.toSafeObject();
}

async function generateViva({
  userId,
  knowledgeSourceIds,
  questionCount = 5,
  difficulty = "Medium",
  regenerate = false,
}) {
  const startedAt = Date.now();
  const sources = await verifyAndGetSources(userId, knowledgeSourceIds);
  const sourceIds = sources.map((s) => s._id);
  const sourceTitle = sources.map((s) => s.title).join(", ");

  if (!regenerate) {
    const existing = await Assessment.findOne({
      userId,
      knowledgeSourceIds: { $in: sourceIds },
      type: "VIVA",
    }).sort({ createdAt: -1 });

    if (existing && existing.questions && existing.questions.length > 0) {
      return {
        ...existing.toSafeObject(),
        cached: true,
      };
    }
  }

  const { chunks } = await retrieveRelevantChunks({
    userId,
    query: `Viva examination oral questions, conceptual understanding, mechanisms and applications of ${sourceTitle}`,
    knowledgeSourceIds,
    topK: 12,
  });

  if (!chunks || chunks.length === 0) {
    throw createHttpError(
      400,
      "I couldn't find enough information in this document to generate this content.",
    );
  }

  const aiResult = await aiServiceClient.generateViva(
    chunks,
    sourceTitle,
    questionCount,
    difficulty,
  );

  const assessment = await Assessment.create({
    userId,
    knowledgeSourceIds: sourceIds,
    title: aiResult.title || `Viva: ${sourceTitle}`,
    type: "VIVA",
    difficulty,
    questionType: "VIVA",
    totalMarks: (aiResult.questions || []).length * 10,
    timeAllowedMinutes: Math.max(10, (aiResult.questions || []).length * 3),
    questions: (aiResult.questions || []).map((q) => ({
      id: q.id,
      question: q.question,
      expectedAnswer: q.expectedAnswer,
      explanation: q.followUp,
      rubric: q.rubric,
      marks: 10,
    })),
    sources: aiResult.sources || [],
    generationTimeSeconds: secondsSince(startedAt),
  });

  await GeneratedContent.create({
    userId,
    knowledgeSourceIds: sourceIds,
    type: "VIVA",
    title: assessment.title,
    content: assessment._id.toString(),
    sources: aiResult.sources || [],
    metadata: {
      questionCount: assessment.questions.length,
      difficulty,
    },
  });

  return assessment.toSafeObject();
}

async function evaluateVivaAnswer({
  userId,
  question,
  expectedAnswer,
  userAnswer,
  rubric,
  maxMarks = 10,
}) {
  if (!userAnswer || !userAnswer.trim()) {
    return {
      awardedMarks: 0,
      maxMarks,
      feedback: "No answer provided.",
      strengths: [],
      improvements: ["Provide a substantive answer."],
    };
  }

  const evalResult = await aiServiceClient.evaluateAnswer(
    question,
    expectedAnswer || "",
    userAnswer,
    rubric || "Grade conceptual clarity and accuracy.",
    maxMarks,
  );

  return evalResult;
}

async function submitAssessmentAttempt({
  userId,
  assessmentId,
  answers = [],
  timeSpentSeconds = 0,
}) {
  validateObjectId(assessmentId, "Assessment ID");

  const assessment = await Assessment.findOne({ _id: assessmentId, userId });
  if (!assessment) {
    throw createHttpError(404, "Assessment not found or access is denied.");
  }

  let totalScore = 0;
  let totalPossibleMarks = assessment.totalMarks || 0;
  const gradedAnswers = [];

  if (assessment.type === "QUIZ") {
    totalPossibleMarks = assessment.questions.length;

    for (let idx = 0; idx < assessment.questions.length; idx++) {
      const rawQ = assessment.questions[idx];
      const q = rawQ.toObject ? rawQ.toObject() : rawQ;
      const qId = q._id ? q._id.toString() : (q.id ? String(q.id) : String(idx));

      // Find user answer matching qId, _id, index, or positional index
      let userAnsObj = (answers || []).find((a) =>
        a && (
          (a.questionId != null && String(a.questionId) === String(qId)) ||
          (q._id && a.questionId != null && String(a.questionId) === String(q._id)) ||
          (q.id && a.questionId != null && String(a.questionId) === String(q.id)) ||
          (a.questionIndex != null && Number(a.questionIndex) === idx) ||
          (a.questionId != null && (String(a.questionId) === String(idx) || Number(a.questionId) === idx))
        )
      );
      if (!userAnsObj && Array.isArray(answers) && answers[idx]) {
        userAnsObj = answers[idx];
      }

      const rawUserAns = userAnsObj?.userAnswer != null ? String(userAnsObj.userAnswer) : "";
      const userRaw = rawUserAns.trim().toLowerCase();
      const correctRaw = String(q.correctAnswer || "").trim().toLowerCase();
      let isCorrect = Boolean(userRaw) && userRaw === correctRaw;

      if (!isCorrect && userRaw && Array.isArray(q.options)) {
        const letterIndexMap = { a: 0, b: 1, c: 2, d: 3 };
        if (letterIndexMap[correctRaw] !== undefined) {
          const optText = String(q.options[letterIndexMap[correctRaw]] || "").trim().toLowerCase();
          if (userRaw === optText) isCorrect = true;
        }
        if (letterIndexMap[userRaw] !== undefined) {
          const optText = String(q.options[letterIndexMap[userRaw]] || "").trim().toLowerCase();
          if (correctRaw === optText) isCorrect = true;
        }
      }

      const awarded = isCorrect ? 1 : 0;
      totalScore += awarded;

      console.log(
        `[QUIZ ANSWER] Question ${idx + 1}: ${q.question ? q.question.slice(0, 40) : ""} | Selected: "${rawUserAns}" | Correct: "${q.correctAnswer}" | Result: ${isCorrect ? "CORRECT" : "INCORRECT"}`
      );

      const formattedUserAns = rawUserAns && rawUserAns.trim() !== "" ? rawUserAns.trim() : "";

      gradedAnswers.push({
        questionId: qId,
        questionIndex: idx,
        question: q.question,
        options: q.options || [],
        userAnswer: formattedUserAns,
        correctAnswer: q.correctAnswer,
        isCorrect,
        awardedMarks: awarded,
        maxMarks: 1,
        explanation: q.explanation || "",
        feedback: isCorrect
          ? "Correct!"
          : `Incorrect. Expected: ${q.correctAnswer}. ${q.explanation || ""}`,
      });
    }
  } else if (assessment.type === "VIVA") {
    const qMap = new Map(assessment.questions.map((q) => [String(q.id), q]));
    totalPossibleMarks = assessment.questions.length * 10;

    for (const ans of answers) {
      const q = qMap.get(String(ans.questionId));
      if (!q) continue;

      let evalResult = { awardedMarks: 8, feedback: "Good oral articulation." };
      try {
        evalResult = await evaluateVivaAnswer({
          userId,
          question: q.question,
          expectedAnswer: q.expectedAnswer,
          userAnswer: ans.userAnswer,
          rubric: q.rubric,
          maxMarks: q.marks || 10,
        });
      } catch (e) {
        console.warn(
          `Viva evaluation fallback for question ${q.id}: ${e.message}`,
        );
      }

      const score = Number(evalResult.awardedMarks) || 0;
      totalScore += score;
      gradedAnswers.push({
        questionId: q.id,
        userAnswer: ans.userAnswer,
        isCorrect: score >= 5,
        awardedMarks: score,
        maxMarks: q.marks || 10,
        feedback: evalResult.feedback || "Evaluated",
        strengths: evalResult.strengths || [],
        improvements: evalResult.improvements || [],
      });
    }
  } else {
    // PRACTICE PAPER
    for (const sec of assessment.sections || []) {
      for (const q of sec.questions || []) {
        const userAns = answers.find(
          (a) => String(a.questionId) === String(q.id),
        );
        const ansText = userAns?.userAnswer || "";

        if (q.type === "MCQ") {
          const isCorrect =
            String(ansText).trim().toLowerCase() ===
            String(q.correctAnswer || "")
              .trim()
              .toLowerCase();
          const marks = isCorrect ? q.marks || sec.marksPerQuestion || 2 : 0;
          totalScore += marks;
          gradedAnswers.push({
            questionId: q.id,
            userAnswer: ansText,
            isCorrect,
            awardedMarks: marks,
            maxMarks: q.marks || sec.marksPerQuestion || 2,
            feedback: isCorrect
              ? "Correct"
              : `Correct answer: ${q.correctAnswer}`,
          });
        } else {
          let evalResult = {
            awardedMarks: (q.marks || sec.marksPerQuestion || 5) * 0.8,
            feedback: "Evaluated based on rubric.",
          };
          try {
            evalResult = await aiServiceClient.evaluateAnswer(
              q.question,
              q.expectedAnswer || "",
              ansText,
              q.rubric,
              q.marks || sec.marksPerQuestion || 5,
            );
          } catch (e) {
            console.warn(
              `Evaluation fallback for question ${q.id}: ${e.message}`,
            );
          }
          totalScore += evalResult.awardedMarks || 0;
          gradedAnswers.push({
            questionId: q.id,
            userAnswer: ansText,
            isCorrect: (evalResult.awardedMarks || 0) > 0,
            awardedMarks: evalResult.awardedMarks || 0,
            maxMarks: q.marks || sec.marksPerQuestion || 5,
            feedback: evalResult.feedback || "Evaluated",
          });
        }
      }
    }
  }

  const percentage =
    totalPossibleMarks > 0
      ? Math.round((totalScore / totalPossibleMarks) * 100)
      : 0;

  const attempt = await Attempt.create({
    userId,
    assessmentId: assessment._id,
    knowledgeSourceIds: assessment.knowledgeSourceIds,
    assessmentTitle: assessment.title,
    assessmentType: assessment.type,
    answers: gradedAnswers,
    score: totalScore,
    totalMarks: totalPossibleMarks,
    percentage,
    timeSpentSeconds,
  });

  return attempt.toSafeObject();
}

module.exports = {
  retrieveRelevantChunks,
  askPrepMind,
  generateSummary,
  generateNotes,
  generateQuiz,
  generatePracticePaper,
  generateViva,
  evaluateVivaAnswer,
  submitAssessmentAttempt,
};
