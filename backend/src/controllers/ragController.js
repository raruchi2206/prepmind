const ragService = require("../services/ragService");
const Assessment = require("../models/Assessment");
const GeneratedContent = require("../models/GeneratedContent");
const { createHttpError } = require("../middleware/errorMiddleware");
const { validateObjectId } = require("../utils/security");

async function retrieveChunks(req, res, next) {
  try {
    const { query, topK } = req.body;
    const knowledgeSourceIds = req.body.knowledgeSourceIds || (req.body.knowledgeSourceId ? [req.body.knowledgeSourceId] : null);
    if (!query || typeof query !== "string" || !query.trim()) {
      throw createHttpError(400, "Query string is required");
    }

    const data = await ragService.retrieveRelevantChunks({
      userId: req.user._id,
      query: query.trim(),
      knowledgeSourceIds: Array.isArray(knowledgeSourceIds)
        ? knowledgeSourceIds
        : null,
      topK: Number(topK) || 5,
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function ask(req, res, next) {
  try {
    const { query, conversationId } = req.body;
    const knowledgeSourceIds = req.body.knowledgeSourceIds || (req.body.knowledgeSourceId ? [req.body.knowledgeSourceId] : null);
    if (!query || typeof query !== "string" || !query.trim()) {
      throw createHttpError(400, "Question query is required");
    }

    const data = await ragService.askPrepMind({
      userId: req.user._id,
      query: query.trim(),
      knowledgeSourceIds: Array.isArray(knowledgeSourceIds)
        ? knowledgeSourceIds
        : null,
      conversationId: conversationId || null,
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function generateSummary(req, res, next) {
  try {
    const { regenerate } = req.body;
    const knowledgeSourceIds = req.body.knowledgeSourceIds || (req.body.knowledgeSourceId ? [req.body.knowledgeSourceId] : []);
    const data = await ragService.generateSummary({
      userId: req.user._id,
      knowledgeSourceIds: Array.isArray(knowledgeSourceIds)
        ? knowledgeSourceIds
        : [knowledgeSourceIds].filter(Boolean),
      regenerate: Boolean(regenerate),
      signal: req.signal,
    });

    res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function generateNotes(req, res, next) {
  try {
    const { regenerate } = req.body;
    const knowledgeSourceIds = req.body.knowledgeSourceIds || (req.body.knowledgeSourceId ? [req.body.knowledgeSourceId] : []);
    const data = await ragService.generateNotes({
      userId: req.user._id,
      knowledgeSourceIds: Array.isArray(knowledgeSourceIds)
        ? knowledgeSourceIds
        : [knowledgeSourceIds].filter(Boolean),
      regenerate: Boolean(regenerate),
      signal: req.signal,
    });

    res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function generateQuiz(req, res, next) {
  try {
    const {
      questionCount,
      difficulty,
      questionType,
      generationId,
      regenerate,
    } = req.body;
    const knowledgeSourceIds = req.body.knowledgeSourceIds || (req.body.knowledgeSourceId ? [req.body.knowledgeSourceId] : []);
    console.log(`[QUIZ DEBUG] request questionCount=${questionCount}`);
    console.log(
      `[QUIZ DEBUG] request difficulty=${String(difficulty || "Medium").toUpperCase()}`,
    );
    console.log(
      `[QUIZ DEBUG] request questionType=${String(questionType || "MCQ").toUpperCase()}`,
    );
    console.log(
      `[QUIZ DEBUG] request knowledgeSourceId=${(knowledgeSourceIds || []).join(",")}`,
    );
    const data = await ragService.generateQuiz({
      userId: req.user._id,
      knowledgeSourceIds: Array.isArray(knowledgeSourceIds)
        ? knowledgeSourceIds
        : [knowledgeSourceIds].filter(Boolean),
      questionCount: Number(questionCount) || 5,
      difficulty: difficulty || "Medium",
      questionType: questionType || "MCQ",
      generationId: generationId || null,
      regenerate: Boolean(regenerate),
    });

    res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function generatePracticePaper(req, res, next) {
  try {
    const { totalMarks, difficulty, regenerate } = req.body;
    const knowledgeSourceIds = req.body.knowledgeSourceIds || (req.body.knowledgeSourceId ? [req.body.knowledgeSourceId] : []);
    const data = await ragService.generatePracticePaper({
      userId: req.user._id,
      knowledgeSourceIds: Array.isArray(knowledgeSourceIds)
        ? knowledgeSourceIds
        : [knowledgeSourceIds].filter(Boolean),
      totalMarks: Number(totalMarks) || 50,
      difficulty: difficulty || "Medium",
      regenerate: Boolean(regenerate),
    });

    res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function generateViva(req, res, next) {
  try {
    const { questionCount, difficulty, regenerate } = req.body;
    const knowledgeSourceIds = req.body.knowledgeSourceIds || (req.body.knowledgeSourceId ? [req.body.knowledgeSourceId] : []);
    const data = await ragService.generateViva({
      userId: req.user._id,
      knowledgeSourceIds: Array.isArray(knowledgeSourceIds)
        ? knowledgeSourceIds
        : [knowledgeSourceIds].filter(Boolean),
      questionCount: Number(questionCount) || 5,
      difficulty: difficulty || "Medium",
      regenerate: Boolean(regenerate),
    });

    res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function evaluateViva(req, res, next) {
  try {
    const { question, expectedAnswer, userAnswer, rubric, maxMarks } = req.body;
    const data = await ragService.evaluateVivaAnswer({
      userId: req.user._id,
      question,
      expectedAnswer,
      userAnswer,
      rubric,
      maxMarks: Number(maxMarks) || 10,
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function getAssessment(req, res, next) {
  try {
    const { id } = req.params;
    validateObjectId(id, "Assessment ID");

    const assessment = await Assessment.findOne({
      _id: id,
      userId: req.user._id,
    });
    if (!assessment) {
      throw createHttpError(404, "Assessment not found");
    }

    res.status(200).json({
      success: true,
      data: assessment.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
}

async function submitAttempt(req, res, next) {
  try {
    const { id } = req.params;
    const { answers, timeSpentSeconds } = req.body;

    const data = await ragService.submitAssessmentAttempt({
      userId: req.user._id,
      assessmentId: id,
      answers: Array.isArray(answers) ? answers : [],
      timeSpentSeconds: Number(timeSpentSeconds) || 0,
    });

    res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  retrieveChunks,
  ask,
  generateSummary,
  generateNotes,
  generateQuiz,
  generatePracticePaper,
  generateViva,
  evaluateViva,
  getAssessment,
  submitAttempt,
};
