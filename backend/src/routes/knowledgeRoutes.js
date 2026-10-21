const express = require("express");
const {
  createKnowledgeSource,
  uploadKnowledgeSource,
  importYouTubeSource,
  getKnowledgeSources,
  getKnowledgeSource,
  updateKnowledgeSource,
  deleteKnowledgeSource,
  processKnowledgeSource,
  getKnowledgeChunks,
  reindexKnowledgeSource,
  reindexAllSources,
} = require("../controllers/knowledgeController");
const { requireAuth } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validate");
const { upload } = require("../middleware/uploadMiddleware");
const { createLimiter } = require("../middleware/rateLimiters");
const {
  createKnowledgeSourceSchema,
  importYouTubeSchema,
  updateKnowledgeSourceSchema,
} = require("../validators/knowledgeValidators");

const router = express.Router();

const youtubeImportLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many YouTube imports. Please wait a minute and try again.",
});
const processLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: "Too many processing requests. Please wait a minute and try again.",
});

// All knowledge management endpoints require authentication
router.use(requireAuth);

router.post("/", validate(createKnowledgeSourceSchema), createKnowledgeSource);
router.post("/upload", upload.single("file"), uploadKnowledgeSource);
router.post(
  "/youtube",
  youtubeImportLimiter,
  validate(importYouTubeSchema),
  importYouTubeSource,
);
router.get("/", getKnowledgeSources);
router.post("/reindex-all", reindexAllSources);
router.get("/:id", getKnowledgeSource);
router.patch(
  "/:id",
  validate(updateKnowledgeSourceSchema),
  updateKnowledgeSource,
);
router.delete("/:id", deleteKnowledgeSource);
router.post("/:id/process", processLimiter, processKnowledgeSource);
router.post("/:id/reindex", reindexKnowledgeSource);
router.get("/:id/chunks", getKnowledgeChunks);

module.exports = router;
