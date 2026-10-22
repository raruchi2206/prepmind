const express = require("express");
const aiServiceClient = require("../services/aiServiceClient");

const router = express.Router();

router.get("/health", async (req, res, next) => {
  try {
    const health = await aiServiceClient.checkHealth();
    if (!health || health.available === false) {
      const errMsg =
        health?.error ||
        health?.groq?.error ||
        health?.ollama?.error ||
        "AI text-generation service is currently unavailable.";
      return res.status(503).json({
        success: false,
        aiService: health?.status === "degraded" ? "connected" : "disconnected",
        primaryProvider: health?.primaryProvider || "groq",
        fallbackProvider: health?.fallbackProvider || "ollama",
        activeProvider: health?.activeProvider || "none",
        message: errMsg,
        data: health,
      });
    }

    return res.json({
      success: true,
      aiService: "connected",
      primaryProvider: health?.primaryProvider || "groq",
      fallbackProvider: health?.fallbackProvider || "ollama",
      activeProvider: health?.activeProvider || "groq",
      groqAvailable: Boolean(health?.groq?.available),
      ollamaAvailable: Boolean(health?.ollama?.available),
      llm: health?.groq?.model || health?.ollama?.model || "openai/gpt-oss-120b",
      embedding: health?.embedding?.active_embedding || "all-minilm:latest",
      data: health,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/diagnostic", async (req, res, next) => {
  try {
    const diag = await aiServiceClient.getDiagnostic();
    return res.json({
      success: true,
      data: diag,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
