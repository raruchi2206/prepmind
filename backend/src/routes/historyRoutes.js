const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const historyController = require("../controllers/historyController");

const router = express.Router();

router.use(requireAuth);

router.get("/", historyController.getHistory);
router.get("/:id", historyController.getHistoryItem);
router.delete("/:id", historyController.deleteHistoryItem);

module.exports = router;
