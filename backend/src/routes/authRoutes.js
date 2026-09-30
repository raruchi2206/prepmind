const express = require("express");
const {
  register,
  login,
  me,
  logout,
  refresh,
  forgotPassword,
  verifyResetOtp,
  resendResetOtp,
  resetPassword,
  changePassword,
} = require("../controllers/authController");
const { requireAuth, optionalAuth } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validate");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resendResetOtpSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require("../validators/authValidators");
const {
  registerLimiter,
  loginLimiter,
  refreshLimiter,
  forgotPasswordLimiter,
  verifyOtpLimiter,
  resendOtpLimiter,
  resetPasswordLimiter,
} = require("../middleware/rateLimiters");

const router = express.Router();

router.post("/register", registerLimiter, validate(registerSchema), register);
router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/logout", optionalAuth, logout);
router.post("/refresh", refreshLimiter, refresh);
router.get("/me", requireAuth, me);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  forgotPassword,
);

router.post(
  "/verify-reset-otp",
  verifyOtpLimiter,
  validate(verifyResetOtpSchema),
  verifyResetOtp,
);

router.post(
  "/resend-reset-otp",
  resendOtpLimiter,
  validate(resendResetOtpSchema),
  resendResetOtp,
);

router.post(
  "/reset-password",
  resetPasswordLimiter,
  validate(resetPasswordSchema),
  resetPassword,
);

router.patch(
  "/change-password",
  requireAuth,
  validate(changePasswordSchema),
  changePassword,
);

module.exports = router;
