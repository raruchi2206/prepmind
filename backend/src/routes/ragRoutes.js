const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const rateLimit = require("express-rate-limit");
const ragController = require("../controllers/ragController");

const router = express.Router();

// Strict user authentication on all RAG endpoints
router.use(requireAuth);

// Rate limiting for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // 30 requests per minute
  message: {
    success: false,
    error: {
      message: "Too many AI generation requests, please slow down.",
    },
  },
});

router.post("/retrieve", ragController.retrieveChunks);
router.post("/ask", aiLimiter, ragController.ask);

// Summary
router.post("/summary", aiLimiter, ragController.generateSummary);
router.post("/generate/summary", aiLimiter, ragController.generateSummary);

// Notes
router.post("/notes", aiLimiter, ragController.generateNotes);
router.post("/generate/notes", aiLimiter, ragController.generateNotes);

// Quiz
router.post("/quiz", aiLimiter, ragController.generateQuiz);
router.post("/generate/quiz", aiLimiter, ragController.generateQuiz);

// Practice Paper
router.post("/practice-paper", aiLimiter, ragController.generatePracticePaper);
router.post("/generate/practice-paper", aiLimiter, ragController.generatePracticePaper);
router.post("/paper", aiLimiter, ragController.generatePracticePaper);
router.post("/generate/paper", aiLimiter, ragController.generatePracticePaper);

// Viva
router.post("/viva", aiLimiter, ragController.generateViva);
router.post("/generate/viva", aiLimiter, ragController.generateViva);
router.post("/evaluate/viva", aiLimiter, ragController.evaluateViva);
router.post("/evaluate", aiLimiter, ragController.evaluateViva);

router.get("/assessments/:id", ragController.getAssessment);
router.post("/assessments/:id/attempt", ragController.submitAttempt);

module.exports = router;
