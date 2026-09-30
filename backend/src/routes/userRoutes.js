const express = require("express");
const { getMe, updateProfile } = require("../controllers/userController");
const { requireAuth } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validate");
const { updateProfileSchema } = require("../validators/userValidators");

const router = express.Router();
router.get("/me", requireAuth, getMe);
router.patch(
  "/profile",
  requireAuth,
  validate(updateProfileSchema),
  updateProfile,
);
module.exports = router;
