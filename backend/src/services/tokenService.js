const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { env } = require("../config/env");

const ACCESS_COOKIE = "pm_access_token";
const REFRESH_COOKIE = "pm_refresh_token";

function createAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      type: "access",
      tokenVersion: user.tokenVersion,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES },
  );
}

function createRefreshToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      type: "refresh",
      tokenVersion: user.tokenVersion,
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES },
  );
}

function createPasswordResetToken(user, resetRecord) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      resetId: resetRecord._id.toString(),
      type: "password_reset",
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: `${env.OTP_EXPIRES_MINUTES}m` },
  );
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (payload.type !== "access") {
    throw new Error("Invalid token type: expected access token");
  }
  return payload;
}

function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
  if (payload.type !== "refresh") {
    throw new Error("Invalid token type: expected refresh token");
  }
  return payload;
}

function verifyPasswordResetToken(token) {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (payload.type !== "password_reset") {
    throw new Error("Invalid token type: expected password_reset token");
  }
  return payload;
}

function cookieOptions(maxAge) {
  const options = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
  if (maxAge !== undefined) {
    options.maxAge = maxAge;
  }
  if (env.COOKIE_DOMAIN) {
    options.domain = env.COOKIE_DOMAIN;
  }
  return options;
}

function setAuthCookies(response, user) {
  response.cookie(
    ACCESS_COOKIE,
    createAccessToken(user),
    cookieOptions(15 * 60 * 1000),
  );
  response.cookie(
    REFRESH_COOKIE,
    createRefreshToken(user),
    cookieOptions(7 * 24 * 60 * 60 * 1000),
  );
}

function clearAuthCookies(response) {
  const options = cookieOptions();
  response.clearCookie(ACCESS_COOKIE, options);
  response.clearCookie(REFRESH_COOKIE, options);
}

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  createAccessToken,
  createRefreshToken,
  createPasswordResetToken,
  hashToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyPasswordResetToken,
  cookieOptions,
  setAuthCookies,
  clearAuthCookies,
};
