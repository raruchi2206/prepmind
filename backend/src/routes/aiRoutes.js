const express = require("express");
const aiServiceClient = require("../services/aiServiceClient");

const router = express.Router();

router.get("/health", async (req, res, next) => {
  try {
    const health = await aiServiceClient.checkHealth();
    if (!health || health.available === false) {
      return res.status(503).json({
        success: false,
        aiService: "disconnected",
        ollama: false,
        message:
          health && health.error
            ? health.error
            : "Unable to connect to the AI service.",
      });
    }

    return res.json({
      success: true,
      aiService: "connected",
      ollama: Boolean(health?.ollama?.available),
      llm: health?.ollama?.active_llm || "unknown",
      embedding: health?.ollama?.active_embedding || "unknown",
      data: health,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
