const express = require("express");
const {
  createKnowledgeSource,
  uploadKnowledgeSource,
  getKnowledgeSources,
  getKnowledgeSource,
  updateKnowledgeSource,
  deleteKnowledgeSource,
} = require("../controllers/knowledgeController");
const { requireAuth } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validate");
const { upload } = require("../middleware/uploadMiddleware");
const {
  createKnowledgeSourceSchema,
  updateKnowledgeSourceSchema,
} = require("../validators/knowledgeValidators");

const router = express.Router();

// All knowledge management endpoints require authentication
router.use(requireAuth);

router.post("/", validate(createKnowledgeSourceSchema), createKnowledgeSource);
router.post("/upload", upload.single("file"), uploadKnowledgeSource);
router.get("/", getKnowledgeSources);
router.get("/:id", getKnowledgeSource);
router.patch(
  "/:id",
  validate(updateKnowledgeSourceSchema),
  updateKnowledgeSource,
);
router.delete("/:id", deleteKnowledgeSource);

module.exports = router;
