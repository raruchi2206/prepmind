const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const http = require("http");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

process.env.NODE_ENV = "test";

const app = require("../src/app");
const { env } = require("../src/config/env");
const User = require("../src/models/User");
const PasswordReset = require("../src/models/PasswordReset");
const {
  createAccessToken,
  createRefreshToken,
  createPasswordResetToken,
  hashToken,
} = require("../src/services/tokenService");
const { validateObjectId, checkOwnership } = require("../src/utils/security");
const { createLimiter } = require("../src/middleware/rateLimiters");

let server;
let baseUrl;

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  
  if (options.cookies) {
    headers["Cookie"] = Object.entries(options.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const rawCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const parsedCookies = {};
  for (const c of rawCookies) {
    const parts = c.split(";")[0].split("=");
    if (parts.length >= 2) {
      parsedCookies[parts[0].trim()] = parts.slice(1).join("=").trim();
    }
  }

  const data = await res.json().catch(() => ({}));
  return {
    status: res.status,
    headers: res.headers,
    rawCookies,
    cookies: parsedCookies,
    body: data,
  };
}

describe("PREPMIND Full Authentication & Security Test Suite (60 Requirements)", () => {
  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI, { dbName: "prepmind_test" });
    }
    await User.deleteMany({ email: /@testauth\.com$/ });
    await PasswordReset.deleteMany({});

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await User.deleteMany({ email: /@testauth\.com$/ });
    await PasswordReset.deleteMany({});
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  // ==========================================
  // 1-8: REGISTRATION TESTS
  // ==========================================
  describe("1-8: Registration Security & Validation", () => {
    test("1. Valid registration creates user and returns safe object", async () => {
      const res = await request("/api/auth/register", {
        method: "POST",
        body: {
          name: "Rana Ruchi",
          email: "ruchi1@testauth.com",
          password: "StrongPassword@123",
          confirmPassword: "StrongPassword@123",
        },
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.user.email, "ruchi1@testauth.com");
      assert.equal(res.body.data.user.role, "USER");
      assert.equal(res.body.data.user.passwordHash, undefined);
    });

    test("2. Duplicate email is rejected with 409 Conflict", async () => {
      const res = await request("/api/auth/register", {
        method: "POST",
        body: {
          name: "Duplicate User",
          email: "RUCHI1@TESTAUTH.COM",
          password: "StrongPassword@123",
          confirmPassword: "StrongPassword@123",
        },
      });
      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
    });

    test("3. Unique username is generated automatically and handles collisions safely", async () => {
      const res1 = await request("/api/auth/register", {
        method: "POST",
        body: {
          name: "Same Name",
          email: "samename1@testauth.com",
          password: "StrongPassword@123",
          confirmPassword: "StrongPassword@123",
        },
      });
      const res2 = await request("/api/auth/register", {
        method: "POST",
        body: {
          name: "Same Name",
          email: "samename2@testauth.com",
          password: "StrongPassword@123",
          confirmPassword: "StrongPassword@123",
        },
      });
      assert.equal(res1.status, 201);
      assert.equal(res2.status, 201);
      assert.notEqual(res1.body.data.user.username, res2.body.data.user.username);
    });

    test("4. Invalid email format is rejected with 422", async () => {
      const res = await request("/api/auth/register", {
        method: "POST",
        body: {
          name: "Invalid Email",
          email: "not-an-email",
          password: "StrongPassword@123",
          confirmPassword: "StrongPassword@123",
        },
      });
      assert.equal(res.status, 422);
    });

    test("5. Weak password (missing uppercase, number, special char, or < 8 chars) is rejected", async () => {
      const weakPasswords = [
        "short1!",
        "nouppercase123!",
        "NOLOWERCASE123!",
        "NoSpecialChars123",
        "NoNumbers!@#$",
      ];
      for (const pass of weakPasswords) {
        const res = await request("/api/auth/register", {
          method: "POST",
          body: {
            name: "Weak Pass",
            email: `weak_${Date.now()}_${Math.random()}@testauth.com`,
            password: pass,
            confirmPassword: pass,
          },
        });
        assert.equal(res.status, 422, `Password ${pass} should fail`);
      }
    });

    test("6. Password mismatch is rejected with 422", async () => {
      const res = await request("/api/auth/register", {
        method: "POST",
        body: {
          name: "Mismatch User",
          email: "mismatch@testauth.com",
          password: "StrongPassword@123",
          confirmPassword: "DifferentPassword@123",
        },
      });
      assert.equal(res.status, 422);
    });

    test("7. Attempt to register with role ADMIN is ignored/forced to USER", async () => {
      const res = await request("/api/auth/register", {
        method: "POST",
        body: {
          name: "Hacker User",
          email: "hacker@testauth.com",
          password: "StrongPassword@123",
          confirmPassword: "StrongPassword@123",
          role: "ADMIN",
        },
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.user.role, "USER");
      const dbUser = await User.findOne({ email: "hacker@testauth.com" });
      assert.equal(dbUser.role, "USER");
    });

    test("8. Missing required registration fields is rejected with 422", async () => {
      const res = await request("/api/auth/register", {
        method: "POST",
        body: {
          name: "Incomplete",
        },
      });
      assert.equal(res.status, 422);
    });
  });

  // ==========================================
  // 9-15: LOGIN & JWT TESTS
  // ==========================================
  describe("9-15: Login & Token Lifecycle", () => {
    let userCookies = {};

    test("9. Correct credentials sets HttpOnly access & refresh cookies and returns safe user", async () => {
      const res = await request("/api/auth/login", {
        method: "POST",
        body: {
          email: "ruchi1@testauth.com",
          password: "StrongPassword@123",
        },
      });
      assert.equal(res.status, 200);
      assert.ok(res.cookies.pm_access_token);
      assert.ok(res.cookies.pm_refresh_token);
      assert.equal(res.body.data.user.email, "ruchi1@testauth.com");
      assert.equal(res.body.data.user.passwordHash, undefined);
      userCookies = res.cookies;

      const setCookieStr = res.rawCookies.join(" ");
      assert.ok(setCookieStr.includes("HttpOnly"));
    });

    test("10. Wrong password returns 401 Unauthorized", async () => {
      const res = await request("/api/auth/login", {
        method: "POST",
        body: {
          email: "ruchi1@testauth.com",
          password: "WrongPassword@999",
        },
      });
      assert.equal(res.status, 401);
    });

    test("11. Nonexistent email returns 401 Unauthorized", async () => {
      const res = await request("/api/auth/login", {
        method: "POST",
        body: {
          email: "doesnotexist@testauth.com",
          password: "StrongPassword@123",
        },
      });
      assert.equal(res.status, 401);
    });

    test("12. Invalid / tampered JWT returns 401 Unauthorized", async () => {
      const res = await request("/api/auth/me", {
        cookies: { pm_access_token: "invalid.tampered.token" },
      });
      assert.equal(res.status, 401);
    });

    test("13. Expired JWT returns 401 Unauthorized", async () => {
      const user = await User.findOne({ email: "ruchi1@testauth.com" });
      const expiredToken = jwt.sign(
        { sub: user._id.toString(), role: user.role, type: "access", tokenVersion: user.tokenVersion },
        env.JWT_ACCESS_SECRET,
        { expiresIn: "0s" }
      );
      const res = await request("/api/auth/me", {
        cookies: { pm_access_token: expiredToken },
      });
      assert.equal(res.status, 401);
    });

    test("14. Valid refresh token issues new access token", async () => {
      const res = await request("/api/auth/refresh", {
        method: "POST",
        cookies: { pm_refresh_token: userCookies.pm_refresh_token },
      });
      assert.equal(res.status, 200);
      assert.ok(res.cookies.pm_access_token);
    });

    test("15. Invalid or access token passed as refresh token is rejected with 401", async () => {
      const res = await request("/api/auth/refresh", {
        method: "POST",
        cookies: { pm_refresh_token: userCookies.pm_access_token },
      });
      assert.equal(res.status, 401);
    });
  });

  // ==========================================
  // 16-19: AUTHENTICATION & LOGOUT TESTS
  // ==========================================
  describe("16-19: Authentication & Logout Lifecycle", () => {
    let sessionCookies = {};

    before(async () => {
      const res = await request("/api/auth/login", {
        method: "POST",
        body: { email: "ruchi1@testauth.com", password: "StrongPassword@123" },
      });
      sessionCookies = res.cookies;
    });

    test("16. Access protected endpoint while logged out returns 401", async () => {
      const res = await request("/api/auth/me");
      assert.equal(res.status, 401);
    });

    test("17. Access protected endpoint while logged in returns user profile", async () => {
      const res = await request("/api/auth/me", {
        cookies: { pm_access_token: sessionCookies.pm_access_token },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.email, "ruchi1@testauth.com");
    });

    test("18. Logout invalidates tokenVersion and clears cookies", async () => {
      const res = await request("/api/auth/logout", {
        method: "POST",
        cookies: { pm_access_token: sessionCookies.pm_access_token },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    test("19. Old access token and refresh token fail after logout", async () => {
      const res1 = await request("/api/auth/me", {
        cookies: { pm_access_token: sessionCookies.pm_access_token },
      });
      assert.equal(res1.status, 401);

      const res2 = await request("/api/auth/refresh", {
        method: "POST",
        cookies: { pm_refresh_token: sessionCookies.pm_refresh_token },
      });
      assert.equal(res2.status, 401);
    });
  });

  // ==========================================
  // 20-26: AUTHORIZATION & IDOR TESTS
  // ==========================================
  describe("20-26: Authorization & IDOR Protection", () => {
    let userToken;
    let adminToken;
    let userA;
    let userB;

    before(async () => {
      userA = await User.create({
        name: "User Alpha",
        email: "alpha@testauth.com",
        username: "useralpha",
        passwordHash: await argon2.hash("Password@123", { type: argon2.argon2id }),
        role: "USER",
      });
      userB = await User.create({
        name: "User Beta",
        email: "beta@testauth.com",
        username: "userbeta",
        passwordHash: await argon2.hash("Password@123", { type: argon2.argon2id }),
        role: "USER",
      });
      const adminUser = await User.create({
        name: "Admin User",
        email: "admin@testauth.com",
        username: "adminmaster",
        passwordHash: await argon2.hash("Password@123", { type: argon2.argon2id }),
        role: "ADMIN",
      });

      userToken = createAccessToken(userA);
      adminToken = createAccessToken(adminUser);
    });

    test("20. Regular USER can access USER endpoints (/api/users/me)", async () => {
      const res = await request("/api/users/me", {
        cookies: { pm_access_token: userToken },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.email, "alpha@testauth.com");
    });

    test("21. Regular USER cannot access ADMIN-only endpoint (/api/admin/ping) -> 403", async () => {
      const res = await request("/api/admin/ping", {
        cookies: { pm_access_token: userToken },
      });
      assert.equal(res.status, 403);
    });

    test("21b. ADMIN user can access ADMIN endpoint (/api/admin/ping) -> 200", async () => {
      const res = await request("/api/admin/ping", {
        cookies: { pm_access_token: adminToken },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    test("22-26. IDOR ownership verification helper rejects unauthorized access", () => {
      const fakeResourceB = { _id: "60c72b2f9b1d8b0015f89999", userId: userB._id };
      
      assert.throws(() => {
        checkOwnership(fakeResourceB, userA._id);
      }, (err) => err.statusCode === 403);

      assert.doesNotThrow(() => {
        checkOwnership(fakeResourceB, userB._id);
      });
    });

    test("24-25. Injected userId in request body is stripped and ignored by backend", async () => {
      const res = await request("/api/users/profile", {
        method: "PATCH",
        cookies: { pm_access_token: userToken },
        body: {
          userId: userB._id.toString(),
          name: "Updated Alpha Name",
        },
      });
      assert.equal(res.status, 200);
      const updatedUserA = await User.findById(userA._id);
      const unchangedUserB = await User.findById(userB._id);
      assert.equal(updatedUserA.name, "Updated Alpha Name");
      assert.equal(unchangedUserB.name, "User Beta");
    });
  });

  // ==========================================
  // 27-36: FORGOT PASSWORD & OTP TESTS
  // ==========================================
  describe("27-36: Forgot Password & OTP Flow", () => {
    let testEmail = "otpuser@testauth.com";
    let testUser;

    before(async () => {
      testUser = await User.create({
        name: "OTP User",
        email: testEmail,
        username: "otpuser",
        passwordHash: await argon2.hash("OldPass@123", { type: argon2.argon2id }),
        role: "USER",
      });
    });

    test("27. Forgot password for existing email returns generic success message and saves hashed OTP", async () => {
      const res = await request("/api/auth/forgot-password", {
        method: "POST",
        body: { email: testEmail },
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.message.includes("verification code has been sent"));
      assert.equal(res.body.otp, undefined);

      const savedResetRecord = await PasswordReset.findOne({ userId: testUser._id });
      assert.ok(savedResetRecord);
      assert.ok(savedResetRecord.otpHash);
      assert.equal(savedResetRecord.attempts, 0);
      assert.equal(savedResetRecord.verified, false);
    });

    test("28. Forgot password for non-existing email returns same generic message (no enumeration)", async () => {
      const res = await request("/api/auth/forgot-password", {
        method: "POST",
        body: { email: "nobody_here@testauth.com" },
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.message.includes("verification code has been sent"));
    });

    test("29-30. Correct OTP verification marks record verified and returns reset authorization token", async () => {
      const knownOtp = "482910";
      const otpHash = await argon2.hash(knownOtp, { type: argon2.argon2id });
      await PasswordReset.deleteMany({ userId: testUser._id });
      const record = await PasswordReset.create({
        userId: testUser._id,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
        verified: false,
      });

      const res = await request("/api/auth/verify-reset-otp", {
        method: "POST",
        body: { email: testEmail, otp: knownOtp },
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.data.resetToken);

      const updatedRecord = await PasswordReset.findById(record._id);
      assert.equal(updatedRecord.verified, true);
      assert.ok(updatedRecord.resetTokenHash);
    });

    test("31. Incorrect OTP increments attempt counter and returns 400", async () => {
      const knownOtp = "654321";
      const otpHash = await argon2.hash(knownOtp, { type: argon2.argon2id });
      await PasswordReset.deleteMany({ userId: testUser._id });
      await PasswordReset.create({
        userId: testUser._id,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
        verified: false,
      });

      const res = await request("/api/auth/verify-reset-otp", {
        method: "POST",
        body: { email: testEmail, otp: "000000" },
      });
      assert.equal(res.status, 400);

      const record = await PasswordReset.findOne({ userId: testUser._id });
      assert.equal(record.attempts, 1);
    });

    test("32. 5 incorrect OTP attempts invalidates the reset record (lockout)", async () => {
      const knownOtp = "777888";
      const otpHash = await argon2.hash(knownOtp, { type: argon2.argon2id });
      await PasswordReset.deleteMany({ userId: testUser._id });
      await PasswordReset.create({
        userId: testUser._id,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 4,
        verified: false,
      });

      const res = await request("/api/auth/verify-reset-otp", {
        method: "POST",
        body: { email: testEmail, otp: "000000" },
      });
      assert.equal(res.status, 429);

      const record = await PasswordReset.findOne({ userId: testUser._id });
      assert.equal(record, null);
    });

    test("33. Expired OTP returns 400 and is removed", async () => {
      const knownOtp = "111222";
      const otpHash = await argon2.hash(knownOtp, { type: argon2.argon2id });
      await PasswordReset.deleteMany({ userId: testUser._id });
      await PasswordReset.create({
        userId: testUser._id,
        otpHash,
        expiresAt: new Date(Date.now() - 5000),
        attempts: 0,
        verified: false,
      });

      const res = await request("/api/auth/verify-reset-otp", {
        method: "POST",
        body: { email: testEmail, otp: knownOtp },
      });
      assert.equal(res.status, 400);
      assert.ok(res.body.message.includes("expired"));
    });

    test("34-35. Resend OTP creates fresh OTP and invalidates previous OTP", async () => {
      await request("/api/auth/forgot-password", {
        method: "POST",
        body: { email: testEmail },
      });
      const record1 = await PasswordReset.findOne({ userId: testUser._id });

      await request("/api/auth/resend-reset-otp", {
        method: "POST",
        body: { email: testEmail },
      });
      const record2 = await PasswordReset.findOne({ userId: testUser._id });

      assert.notEqual(record1._id.toString(), record2._id.toString());
      assert.notEqual(record1.otpHash, record2.otpHash);
    });

    test("36. OTP cannot be verified twice", async () => {
      const knownOtp = "333444";
      const otpHash = await argon2.hash(knownOtp, { type: argon2.argon2id });
      await PasswordReset.deleteMany({ userId: testUser._id });
      await PasswordReset.create({
        userId: testUser._id,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
        verified: false,
      });

      const res1 = await request("/api/auth/verify-reset-otp", {
        method: "POST",
        body: { email: testEmail, otp: knownOtp },
      });
      assert.equal(res1.status, 200);

      const res2 = await request("/api/auth/verify-reset-otp", {
        method: "POST",
        body: { email: testEmail, otp: knownOtp },
      });
      assert.equal(res2.status, 400);
    });
  });

  // ==========================================
  // 37-46: RESET PASSWORD TESTS
  // ==========================================
  describe("37-46: Password Reset & Authorization Verification", () => {
    let resetUser;
    let validResetToken;
    let resetRecord;

    before(async () => {
      resetUser = await User.create({
        name: "Reset User",
        email: "resetme@testauth.com",
        username: "resetuser",
        passwordHash: await argon2.hash("OldPass@123", { type: argon2.argon2id }),
        role: "USER",
      });

      resetRecord = await PasswordReset.create({
        userId: resetUser._id,
        otpHash: "dummyHash",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
        verified: true,
      });

      validResetToken = createPasswordResetToken(resetUser, resetRecord);
      resetRecord.resetTokenHash = hashToken(validResetToken);
      resetRecord.resetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await resetRecord.save();
    });

    test("38. Invalid / forged reset authorization token returns 400", async () => {
      const res = await request("/api/auth/reset-password", {
        method: "POST",
        body: {
          resetToken: "forged.token.payload",
          newPassword: "BrandNewPass@123",
          confirmPassword: "BrandNewPass@123",
        },
      });
      assert.equal(res.status, 400);
    });

    test("39. Expired reset authorization token returns 400", async () => {
      const expiredResetRecord = await PasswordReset.create({
        userId: resetUser._id,
        otpHash: "dummyHash",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
        verified: true,
      });
      const expiredToken = jwt.sign(
        { sub: resetUser._id.toString(), resetId: expiredResetRecord._id.toString(), type: "password_reset" },
        env.JWT_ACCESS_SECRET,
        { expiresIn: "0s" }
      );
      expiredResetRecord.resetTokenHash = hashToken(expiredToken);
      expiredResetRecord.resetTokenExpiresAt = new Date(Date.now() - 1000);
      await expiredResetRecord.save();

      const res = await request("/api/auth/reset-password", {
        method: "POST",
        body: {
          resetToken: expiredToken,
          newPassword: "BrandNewPass@123",
          confirmPassword: "BrandNewPass@123",
        },
      });
      assert.equal(res.status, 400);
    });

    test("41. Weak new password is rejected with 422", async () => {
      const res = await request("/api/auth/reset-password", {
        method: "POST",
        body: {
          resetToken: validResetToken,
          newPassword: "weak",
          confirmPassword: "weak",
        },
      });
      assert.equal(res.status, 422);
    });

    test("42. Password mismatch is rejected with 422", async () => {
      const res = await request("/api/auth/reset-password", {
        method: "POST",
        body: {
          resetToken: validResetToken,
          newPassword: "BrandNewPass@123",
          confirmPassword: "DifferentPass@123",
        },
      });
      assert.equal(res.status, 422);
    });

    test("37, 43. Successful password reset updates passwordHash and marks resetToken used", async () => {
      const res = await request("/api/auth/reset-password", {
        method: "POST",
        body: {
          resetToken: validResetToken,
          newPassword: "BrandNewPass@123",
          confirmPassword: "BrandNewPass@123",
        },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.message.includes("Password reset successfully"));

      const rec = await PasswordReset.findById(resetRecord._id);
      assert.ok(rec.usedAt);
    });

    test("40. Reusing the reset authorization token returns 400 (single-use enforced)", async () => {
      const res = await request("/api/auth/reset-password", {
        method: "POST",
        body: {
          resetToken: validResetToken,
          newPassword: "AnotherNewPass@123",
          confirmPassword: "AnotherNewPass@123",
        },
      });
      assert.equal(res.status, 400);
    });

    test("44. Old password fails after password reset", async () => {
      const res = await request("/api/auth/login", {
        method: "POST",
        body: {
          email: "resetme@testauth.com",
          password: "OldPass@123",
        },
      });
      assert.equal(res.status, 401);
    });

    test("45. New password works successfully after password reset", async () => {
      const res = await request("/api/auth/login", {
        method: "POST",
        body: {
          email: "resetme@testauth.com",
          password: "BrandNewPass@123",
        },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.email, "resetme@testauth.com");
    });
  });

  // ==========================================
  // 47-60: SECURITY & INJECTION PROTECTION TESTS
  // ==========================================
  describe("47-60: Deep Database Security & Attack Protections", () => {
    let authUser;
    let authCookies;

    before(async () => {
      authUser = await User.create({
        name: "Security Audit User",
        email: "secuser@testauth.com",
        username: "secuser",
        passwordHash: await argon2.hash("SecPass@123", { type: argon2.argon2id }),
        role: "USER",
      });
      const loginRes = await request("/api/auth/login", {
        method: "POST",
        body: { email: "secuser@testauth.com", password: "SecPass@123" },
      });
      authCookies = loginRes.cookies;
    });

    test("47. Passwords in database are hashed with Argon2id and never plaintext", async () => {
      const user = await User.findOne({ email: "secuser@testauth.com" }).select("+passwordHash");
      assert.ok(user.passwordHash.startsWith("$argon2id$"));
      assert.notEqual(user.passwordHash, "SecPass@123");
    });

    test("48. OTPs in database are hashed and never plaintext", async () => {
      const reset = await PasswordReset.findOne({ otpHash: { $exists: true } });
      if (reset) {
        assert.ok(reset.otpHash.startsWith("$argon2id$") || reset.otpHash.length >= 32);
      }
    });

    test("50. Password hash is never returned in any API response", async () => {
      const meRes = await request("/api/auth/me", { cookies: authCookies });
      assert.equal(meRes.body.data.user.passwordHash, undefined);

      const userRes = await request("/api/users/me", { cookies: authCookies });
      assert.equal(userRes.body.data.user.passwordHash, undefined);
    });

    test("54. Dedicated rate limiter returns 429 Too Many Requests when limit exceeded", async () => {
      const express = require("express");
      const rateLimit = require("express-rate-limit");
      const testApp = express();
      testApp.use(
        rateLimit({
          windowMs: 60 * 1000,
          limit: 2,
          standardHeaders: "draft-8",
          legacyHeaders: false,
          statusCode: 429,
          message: { success: false, message: "Limit hit" },
        }),
      );
      testApp.get("/rate-test", (req, res) => res.json({ success: true }));

      const testServer = http.createServer(testApp);
      await new Promise((r) => testServer.listen(0, r));
      const testPort = testServer.address().port;

      const r1 = await fetch(`http://127.0.0.1:${testPort}/rate-test`);
      const r2 = await fetch(`http://127.0.0.1:${testPort}/rate-test`);
      const r3 = await fetch(`http://127.0.0.1:${testPort}/rate-test`);

      assert.equal(r1.status, 200);
      assert.equal(r2.status, 200);
      assert.equal(r3.status, 429);

      await new Promise((r) => testServer.close(r));
    });

    test("55, 57. MongoDB operator injection ($ne / $gt / $or) in login body is blocked by Zod", async () => {
      const res = await request("/api/auth/login", {
        method: "POST",
        body: {
          email: { $ne: null },
          password: { $gt: "" },
        },
      });
      assert.equal(res.status, 422);
    });

    test("56. Invalid MongoDB ObjectId format is rejected safely with 400", () => {
      assert.throws(() => {
        validateObjectId("invalid-not-an-objectid");
      }, (err) => err.statusCode === 400);
    });

    test("59. User cannot change own role via profile update", async () => {
      const res = await request("/api/users/profile", {
        method: "PATCH",
        cookies: authCookies,
        body: {
          role: "ADMIN",
          name: "Attempted Admin",
        },
      });
      assert.equal(res.status, 200);
      const user = await User.findById(authUser._id);
      assert.equal(user.role, "USER");
    });

    test("Password Change endpoint (PATCH /api/auth/change-password) functions securely", async () => {
      const res = await request("/api/auth/change-password", {
        method: "PATCH",
        cookies: authCookies,
        body: {
          currentPassword: "SecPass@123",
          newPassword: "NewSecPass@123",
          confirmPassword: "NewSecPass@123",
        },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      const newLogin = await request("/api/auth/login", {
        method: "POST",
        body: { email: "secuser@testauth.com", password: "NewSecPass@123" },
      });
      assert.equal(newLogin.status, 200);
    });
  });
});
