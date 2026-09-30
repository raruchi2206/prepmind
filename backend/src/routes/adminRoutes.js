const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");

const router = express.Router();
router.get("/ping", requireAuth, authorize("ADMIN"), (request, response) => {
  response.json({
    success: true,
    data: { message: "Admin authorization passed" },
  });
});

module.exports = router;
