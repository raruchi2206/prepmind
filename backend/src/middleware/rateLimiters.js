const rateLimit = require("express-rate-limit");

function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    statusCode: 429,
    skip: () => process.env.NODE_ENV === "test",
    message: {
      success: false,
      message: message || "Too many requests. Please try again later.",
    },
  });
}

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests to authentication endpoints. Try again later.",
});

const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please try again in 15 minutes.",
});

const registerLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many accounts created from this IP. Try again in 15 minutes.",
});

const refreshLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "Too many token refresh attempts. Try again later.",
});

const forgotPasswordLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many password reset requests. Please wait before trying again.",
});

const verifyOtpLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many OTP verification attempts. Try again later.",
});

const resendOtpLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: "Too many OTP resend attempts. Please wait 15 minutes.",
});

const resetPasswordLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many password reset attempts. Please try again later.",
});

module.exports = {
  createLimiter,
  authLimiter,
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  forgotPasswordLimiter,
  verifyOtpLimiter,
  resendOtpLimiter,
  resetPasswordLimiter,
};
