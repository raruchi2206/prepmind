const User = require("../models/User");
const {
  registerUser,
  authenticateUser,
  requestPasswordReset,
  verifyPasswordResetOTP,
  resetPassword: performResetPassword,
  changePassword: performChangePassword,
} = require("../services/authService");
const { createHttpError } = require("../middleware/errorMiddleware");
const {
  REFRESH_COOKIE,
  ACCESS_COOKIE,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  createAccessToken,
  cookieOptions,
} = require("../services/tokenService");

async function register(request, response, next) {
  try {
    const user = await registerUser(request.body);
    response.status(201).json({
      success: true,
      message: "Account created successfully",
      data: { user: user.toSafeObject() },
    });
  } catch (error) {
    next(error);
  }
}

async function login(request, response, next) {
  try {
    const user = await authenticateUser(request.body);
    setAuthCookies(response, user);
    response.json({
      success: true,
      message: "Logged in successfully",
      data: { user: user.toSafeObject() },
    });
  } catch (error) {
    next(error);
  }
}

async function me(request, response) {
  response.json({
    success: true,
    data: { user: request.user.toSafeObject() },
  });
}

async function logout(request, response, next) {
  try {
    if (request.user) {
      await User.findByIdAndUpdate(request.user._id, {
        $inc: { tokenVersion: 1 },
      });
    }
    clearAuthCookies(response);
    response.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
}

async function refresh(request, response, next) {
  try {
    const token = request.cookies[REFRESH_COOKIE];
    if (!token) {
      throw createHttpError(401, "Refresh authentication required");
    }
    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.sub);
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw createHttpError(401, "Refresh session is invalid or expired");
    }
    response.cookie(
      ACCESS_COOKIE,
      createAccessToken(user),
      cookieOptions(15 * 60 * 1000),
    );
    response.json({ success: true, message: "Access token refreshed" });
  } catch (error) {
    next(
      error.statusCode
        ? error
        : createHttpError(401, "Refresh session is invalid or expired"),
    );
  }
}

async function forgotPassword(request, response, next) {
  try {
    await requestPasswordReset(request.body.email);
    response.json({
      success: true,
      message:
        "If an account exists for this email, a verification code has been sent.",
    });
  } catch (error) {
    next(error);
  }
}

async function verifyResetOtp(request, response, next) {
  try {
    const resetToken = await verifyPasswordResetOTP(request.body);
    response.json({
      success: true,
      message: "Code verified successfully",
      data: { resetToken },
    });
  } catch (error) {
    next(error);
  }
}

async function resendResetOtp(request, response, next) {
  try {
    await requestPasswordReset(request.body.email);
    response.json({
      success: true,
      message:
        "If an account exists for this email, a new verification code has been sent.",
    });
  } catch (error) {
    next(error);
  }
}

async function resetPassword(request, response, next) {
  try {
    await performResetPassword(request.body);
    response.json({
      success: true,
      message:
        "Password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    next(error);
  }
}

async function changePassword(request, response, next) {
  try {
    const updatedUser = await performChangePassword({
      userId: request.user._id,
      currentPassword: request.body.currentPassword,
      newPassword: request.body.newPassword,
    });
    // Re-issue auth cookies for current session with updated tokenVersion
    setAuthCookies(response, updatedUser);
    response.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
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
};
