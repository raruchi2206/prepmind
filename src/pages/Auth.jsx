import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { KnowledgeSignal } from "../components/KnowledgeSignal";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../services/api";
import { validatePassword, validateRegistration } from "../utils/validation";

function AuthShell({ theme, children }) {
  const light = theme === "light";
  return (
    <div className="grid min-h-screen grid-cols-1 bg-[var(--background)] text-[var(--text-primary)] lg:grid-cols-[0.9fr_1.1fr]">
      <div
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center p-12"
        style={{ background: light ? "#F1EEE7" : "#1F150C" }}
      >
        <div className="relative z-10 w-full max-w-md text-center">
          <div className="mb-8 flex justify-center">
            <KnowledgeSignal size={82} animated light={light} />
          </div>
          <p className="font-display text-[0.8rem] uppercase tracking-[0.22em] text-[var(--text-secondary)]">
            PrepMind
          </p>
          <h2
            className="mt-6 text-4xl leading-tight font-serif"
            style={{
              fontFamily: "Fraunces, Georgia, serif",
              letterSpacing: "-0.04em",
            }}
          >
            Your knowledge,
            <br />
            prepared intelligently.
          </h2>
          <div className="mt-8 space-y-3 text-sm text-[var(--text-secondary)]">
            <p className="flex items-center justify-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
              Upload once. Prepare many ways.
            </p>
            <p className="flex items-center justify-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
              Quizzes, notes, and viva from one upload.
            </p>
            <p className="flex items-center justify-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
              Secure, role-based access for your studies.
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center px-6 py-12 lg:px-12">
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <KnowledgeSignal size={28} animated light={light} />
          <span className="font-display text-sm uppercase tracking-[0.2em] font-semibold">
            PrepMind
          </span>
        </div>
        <div className="w-full max-w-[460px]">{children}</div>
      </div>
    </div>
  );
}

function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  theme,
  autoComplete,
  disabled,
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const light = theme === "light";
  return (
    <div>
      <label className="mb-2 block text-[0.82rem] font-medium text-[var(--text-primary)]">
        {label}
      </label>
      <div className="relative">
        <input
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className="w-full rounded-xl border px-4 py-3 text-[0.94rem] text-[var(--text-primary)] placeholder:text-[#817A70] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none transition-all disabled:opacity-60"
          style={{
            background: light ? "#F8F7F3" : "#14110D",
            borderColor: light ? "#D9D2C7" : "#3A342C",
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[0.7rem] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {show ? "Hide" : "Show"}
          </button>
        )}
      </div>
    </div>
  );
}

function AuthAlert({ error, success }) {
  if (error) {
    return (
      <div
        role="alert"
        className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#A84B43]/30 bg-[#A84B43]/10 px-4 py-3 text-sm text-[#E06D60] animate-fade-in"
      >
        <span className="mt-0.5 shrink-0 text-base font-bold">⚠</span>
        <span>{error}</span>
      </div>
    );
  }
  if (success) {
    return (
      <div
        role="status"
        className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#488456]/30 bg-[#488456]/10 px-4 py-3 text-sm text-[#66B87B] animate-fade-in"
      >
        <span className="mt-0.5 shrink-0 text-base font-bold">✓</span>
        <span>{success}</span>
      </div>
    );
  }
  return null;
}

function PasswordRequirements({ password }) {
  const reqs = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Uppercase letter (A-Z)", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter (a-z)", met: /[a-z]/.test(password) },
    { label: "Number (0-9)", met: /[0-9]/.test(password) },
    { label: "Special character (!@#$...)", met: /[^A-Za-z0-9]/.test(password) },
  ];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs">
      <p className="font-medium text-[var(--text-secondary)]">Password requirements:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {reqs.map((r, i) => (
          <div
            key={i}
            className={`flex items-center gap-1.5 ${
              r.met ? "text-emerald-500 font-medium" : "text-[var(--text-secondary)]"
            }`}
          >
            <span>{r.met ? "✓" : "○"}</span>
            <span>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Login({ theme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Please provide both email and password.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Failed to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell theme={theme}>
      <div className="animate-fade-in-up">
        <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          Welcome back
        </p>
        <h1
          className="mb-6 text-3xl font-bold leading-tight md:text-4xl font-serif"
          style={{
            fontFamily: "Fraunces, Georgia, serif",
            letterSpacing: "-0.04em",
          }}
        >
          Sign in to PrepMind
        </h1>
        <AuthAlert error={error} />
        <form onSubmit={handleLogin} className="space-y-4">
          <InputField
            label="Email Address"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
            theme={theme}
          />
          <InputField
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Enter your password"
            autoComplete="current-password"
            theme={theme}
          />
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <button
            disabled={submitting}
            type="submit"
            className="btn btn-primary mt-2 h-[52px] w-full text-[0.82rem] font-semibold tracking-wide shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Signing in..." : "Sign In →"}
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="font-semibold text-[var(--primary)] hover:underline ml-1"
          >
            Create account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function Signup({ theme }) {
  const navigate = useNavigate();
  const { register, login } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const update = (key) => (value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSignup = async (event) => {
    event.preventDefault();
    const validationErrors = validateRegistration(form);
    const firstError = Object.values(validationErrors)[0];
    if (firstError) {
      setError(firstError);
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await register(form);
      // Auto login after successful registration
      await login({ email: form.email, password: form.password });
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Unable to register account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell theme={theme}>
      <div className="animate-fade-in-up">
        <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          Get started
        </p>
        <h1
          className="mb-6 text-3xl font-bold leading-tight md:text-4xl font-serif"
          style={{
            fontFamily: "Fraunces, Georgia, serif",
            letterSpacing: "-0.04em",
          }}
        >
          Create your account
        </h1>
        <AuthAlert error={error} />
        <form onSubmit={handleSignup} className="space-y-4">
          <InputField
            label="Full Name"
            value={form.name}
            onChange={update("name")}
            placeholder="Rana Ruchi"
            autoComplete="name"
            theme={theme}
          />
          <InputField
            label="Email Address"
            type="email"
            value={form.email}
            onChange={update("email")}
            placeholder="you@example.com"
            autoComplete="email"
            theme={theme}
          />
          <InputField
            label="Password"
            type="password"
            value={form.password}
            onChange={update("password")}
            placeholder="Create a strong password"
            autoComplete="new-password"
            theme={theme}
          />
          <PasswordRequirements password={form.password} />
          <InputField
            label="Confirm Password"
            type="password"
            value={form.confirmPassword}
            onChange={update("confirmPassword")}
            placeholder="Confirm your password"
            autoComplete="new-password"
            theme={theme}
          />
          <button
            disabled={submitting}
            type="submit"
            className="btn btn-primary mt-3 h-[52px] w-full text-[0.82rem] font-semibold tracking-wide shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating Account..." : "Create Account →"}
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-[var(--primary)] hover:underline ml-1"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function ForgotPassword({ theme }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSendOtp = async (event) => {
    event.preventDefault();
    if (!email.trim()) {
      setError("Please enter your account email address.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await authApi.forgotPassword({ email });
      // Navigate to OTP verification page with state
      navigate("/verify-otp", { state: { email } });
    } catch (requestError) {
      setError(requestError.message || "Failed to process password reset.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell theme={theme}>
      <div className="animate-fade-in-up">
        <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          Account Recovery
        </p>
        <h1
          className="mb-4 text-3xl font-bold leading-tight md:text-4xl font-serif"
          style={{
            fontFamily: "Fraunces, Georgia, serif",
            letterSpacing: "-0.04em",
          }}
        >
          Reset your password
        </h1>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          Enter the email associated with your PrepMind account. We'll send a 6-digit verification code to reset your password.
        </p>
        <AuthAlert error={error} />
        <form onSubmit={handleSendOtp} className="space-y-4">
          <InputField
            label="Email Address"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
            theme={theme}
          />
          <button
            disabled={submitting}
            type="submit"
            className="btn btn-primary h-[52px] w-full text-[0.82rem] font-semibold tracking-wide shadow-md transition-all disabled:opacity-60"
          >
            {submitting ? "Sending Code..." : "Send Verification Code →"}
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">
          Remember your password?{" "}
          <Link
            to="/login"
            className="font-semibold text-[var(--primary)] hover:underline ml-1"
          >
            ← Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function VerifyOTP({ theme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes countdown

  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate("/forgot-password", { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    // Handle paste of whole 6-digit code
    if (value.length > 1) {
      const pastedDigits = value.replace(/\D/g, "").slice(0, 6).split("");
      pastedDigits.forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(pastedDigits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    const fullOtp = otp.join("");
    if (fullOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const response = await authApi.verifyResetOtp({
        email,
        otp: fullOtp,
      });
      const resetToken = response.data?.resetToken;
      if (!resetToken) {
        throw new Error("No reset authorization received from server.");
      }
      navigate("/reset-password", {
        state: { email, resetToken },
        replace: true,
      });
    } catch (requestError) {
      setError(requestError.message || "Invalid or expired verification code.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccess("");
    setResending(true);
    try {
      await authApi.resendResetOtp({ email });
      setSuccess("A new verification code has been sent to your email.");
      setTimeLeft(600);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (requestError) {
      setError(requestError.message || "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  const light = theme === "light";

  return (
    <AuthShell theme={theme}>
      <div className="animate-fade-in-up">
        <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          Verification Code
        </p>
        <h1
          className="mb-3 text-3xl font-bold leading-tight md:text-4xl font-serif"
          style={{
            fontFamily: "Fraunces, Georgia, serif",
            letterSpacing: "-0.04em",
          }}
        >
          Enter 6-digit code
        </h1>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          We sent a verification code to{" "}
          <strong className="text-[var(--text-primary)]">{email}</strong>. Enter it below to verify your request.
        </p>

        <AuthAlert error={error} success={success} />

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-between gap-2 sm:gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="h-14 w-full rounded-xl border text-center text-2xl font-bold font-mono text-[var(--text-primary)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)] focus:outline-none transition-all"
                style={{
                  background: light ? "#F8F7F3" : "#14110D",
                  borderColor: light ? "#D9D2C7" : "#3A342C",
                }}
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Code expires in: <span className="font-mono text-sm text-[var(--text-primary)]">{formatTime(timeLeft)}</span>
            </span>
            <button
              type="button"
              disabled={resending}
              onClick={handleResend}
              className="font-semibold text-[var(--primary)] hover:underline disabled:opacity-50"
            >
              {resending ? "Sending..." : "Resend Code"}
            </button>
          </div>

          <button
            disabled={submitting || otp.join("").length !== 6}
            type="submit"
            className="btn btn-primary h-[52px] w-full text-[0.82rem] font-semibold tracking-wide shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Verifying Code..." : "Verify Code →"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">
          <Link
            to="/forgot-password"
            className="font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            ← Change email address
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function ResetPassword({ theme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = location.state?.resetToken || "";
  const email = location.state?.email || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!resetToken) {
      navigate("/forgot-password", { replace: true });
    }
  }, [resetToken, navigate]);

  const handleReset = async (event) => {
    event.preventDefault();
    const passErrors = validatePassword(password);
    if (passErrors.length > 0) {
      setError(passErrors[0]);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await authApi.resetPassword({
        resetToken,
        newPassword: password,
        confirmPassword,
      });
      setSuccess(true);
    } catch (requestError) {
      setError(requestError.message || "Failed to reset password. Please restart the recovery flow.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell theme={theme}>
      <div className="animate-fade-in-up">
        <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          Account Security
        </p>
        <h1
          className="mb-3 text-3xl font-bold leading-tight md:text-4xl font-serif"
          style={{
            fontFamily: "Fraunces, Georgia, serif",
            letterSpacing: "-0.04em",
          }}
        >
          Create new password
        </h1>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          Your identity has been verified. Choose a strong new password for{" "}
          <strong className="text-[var(--text-primary)]">{email}</strong>.
        </p>

        {success ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 text-2xl font-bold">
              ✓
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              Password reset successfully!
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Your password has been securely updated. You can now log in with your new credentials.
            </p>
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="btn btn-primary h-[50px] w-full text-sm font-semibold mt-4"
            >
              Sign In with New Password →
            </button>
          </div>
        ) : (
          <>
            <AuthAlert error={error} />
            <form onSubmit={handleReset} className="space-y-4">
              <InputField
                label="New Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Enter new password"
                autoComplete="new-password"
                theme={theme}
              />
              <PasswordRequirements password={password} />
              <InputField
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirm new password"
                autoComplete="new-password"
                theme={theme}
              />
              <button
                disabled={submitting}
                type="submit"
                className="btn btn-primary mt-3 h-[52px] w-full text-[0.82rem] font-semibold tracking-wide shadow-md transition-all disabled:opacity-60"
              >
                {submitting ? "Resetting Password..." : "Update Password →"}
              </button>
            </form>
          </>
        )}
      </div>
    </AuthShell>
  );
}
