import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const focusTopics = [
  ["Normalization", 82],
  ["Transactions", 64],
  ["Indexes", 78],
];
const preparation = [
  ["Knowledge sources", "12"],
  ["Recent assessments", "2"],
  ["Focus topics", "4"],
  ["Viva sessions", "1"],
];

function Icon({ type }) {
  const paths = {
    user: (
      <>
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="8" r="4" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 1 1 8 0v3" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56" />
      </>
    ),
    bell: (
      <>
        <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </>
    ),
    close: (
      <>
        <path d="M18 6 6 18M6 6l12 12" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[type]}
    </svg>
  );
}

function SectionLabel({ children, colors }) {
  return (
    <p
      className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.14em]"
      style={{ color: colors.muted }}
    >
      {children}
    </p>
  );
}

function Modal({ title, eyebrow, onClose, colors, children }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4">
      <div
        className="w-full max-w-md rounded-2xl border p-5 shadow-2xl"
        style={{ background: colors.surface, borderColor: colors.border }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            {eyebrow && (
              <p
                className="text-[0.72rem] font-semibold uppercase tracking-[0.14em]"
                style={{ color: colors.muted }}
              >
                {eyebrow}
              </p>
            )}
            <h2
              className="mt-1 text-[1.5rem] font-semibold"
              style={{ color: colors.text }}
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ color: colors.muted }}
            aria-label={`Close ${title}`}
          >
            <Icon type="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SettingsRow({
  icon,
  title,
  description,
  value,
  onClick,
  colors,
  light,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b py-4 text-left transition-colors last:border-b-0 hover:bg-[var(--surface-elevated)]"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: light ? "#F1EEE7" : "#1F150C",
          color: colors.accent,
        }}
      >
        <Icon type={icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block text-[0.98rem] font-medium"
          style={{ color: colors.text }}
        >
          {title}
        </span>
        <span
          className="mt-0.5 block text-[0.82rem]"
          style={{ color: colors.muted }}
        >
          {description}
        </span>
      </span>
      {value && (
        <span
          className="text-[0.82rem] font-medium"
          style={{ color: colors.muted }}
        >
          {value}
        </span>
      )}
      <span className="text-lg" style={{ color: colors.muted }}>
        ›
      </span>
    </button>
  );
}

export default function Profile({ theme, onThemeToggle, onSetTheme }) {
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useAuth();
  const light = theme === "light";
  const colors = {
    surface: light ? "#FFFFFF" : "#14100C",
    elevated: light ? "#F1EEE7" : "#1F150C",
    text: light ? "#17130F" : "#F7F3E8",
    muted: light ? "#5F574D" : "#B8B0A3",
    accent: light ? "#412D15" : "#E1DCC9",
    border: light ? "#E5DFD3" : "rgba(225,220,201,0.14)",
  };
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });
  const [profileError, setProfileError] = useState("");
  const [password, setPassword] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const currentTheme = light ? "light" : "dark";
  const themeOptions = [
    { label: "Light", value: "light" },
    { label: "Dark", value: "dark" },
    { label: "System", value: "system" },
  ];

  const setTheme = (value) => {
    if (onSetTheme) onSetTheme(value);
    else if (value !== "system" && value !== currentTheme) onThemeToggle();
    setAppearanceOpen(false);
  };

  const initials = (user?.name || "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleProfileSave = async () => {
    try {
      setProfileError("");
      setProfileSubmitting(true);
      await updateProfile({ name: profile.name });
      setEditOpen(false);
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handlePasswordSave = async () => {
    setPasswordError("");
    setPasswordSuccess("");
    if (!password.current) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (password.next.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (password.next !== password.confirm) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordSubmitting(true);
    try {
      await authApi.changePassword({
        currentPassword: password.current,
        newPassword: password.next,
        confirmPassword: password.confirm,
      });
      setPasswordSuccess("Password changed successfully.");
      setPassword({ current: "", next: "", confirm: "" });
      setTimeout(() => {
        setPasswordOpen(false);
        setPasswordSuccess("");
      }, 1500);
    } catch (error) {
      setPasswordError(error.message || "Failed to change password.");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div
      className="page-shell"
      style={{ background: light ? "#F8F7F3" : "#000000" }}
    >
      <div className="page-inner max-w-6xl">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium"
          style={{ color: colors.muted }}
        >
          ← Dashboard
        </Link>

        <header className="mt-8 animate-fade-in-up">
          <p className="section-label">Account</p>
          <h1 className="page-title mt-3">Profile</h1>
          <p className="page-subtitle mt-3 max-w-xl">
            Manage your PrepMind account and see your preparation activity.
          </p>
        </header>

        <section
          className="mt-10 border-b pb-8 animate-fade-in-up delay-100"
          style={{ borderColor: colors.border }}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border text-xl font-semibold"
                style={{
                  background: light ? "#EDE4D7" : "#211910",
                  borderColor: colors.border,
                  color: colors.accent,
                }}
              >
                {user?.avatar || initials}
              </div>
              <div>
                <h2
                  className="text-2xl font-semibold"
                  style={{ color: colors.text }}
                >
                  {profile.name}
                </h2>
                <p className="mt-1 text-base" style={{ color: colors.muted }}>
                  {profile.email}
                </p>
                <p
                  className="mt-2 text-[0.76rem] font-medium uppercase tracking-[0.12em]"
                  style={{ color: colors.muted }}
                >
                  Free Plan
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="btn btn-secondary w-fit"
            >
              Edit profile →
            </button>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.85fr]">
          <main className="space-y-8">
            <section
              className="border-b pb-7"
              style={{ borderColor: colors.border }}
            >
              <SectionLabel colors={colors}>Quick preparation</SectionLabel>
              <div
                className="grid grid-cols-3 divide-x"
                style={{ borderColor: colors.border }}
              >
                {[
                  ["12", "Sources"],
                  ["48", "Topics"],
                  ["83%", "Avg score"],
                ].map(([value, label]) => (
                  <div key={label} className="px-4 first:pl-0 last:pr-0">
                    <p
                      className="text-3xl font-semibold"
                      style={{ color: colors.text }}
                    >
                      {value}
                    </p>
                    <p
                      className="mt-2 text-[0.72rem] font-medium uppercase tracking-[0.1em]"
                      style={{ color: colors.muted }}
                    >
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section
              className="border-b pb-7"
              style={{ borderColor: colors.border }}
            >
              <SectionLabel colors={colors}>Your preparation</SectionLabel>
              <div>
                {preparation.map(([label, value]) => (
                  <Link
                    key={label}
                    to={
                      label === "Knowledge sources" ? "/knowledge" : "/history"
                    }
                    className="flex items-center gap-3 border-b py-3.5 transition-colors last:border-b-0 hover:bg-[var(--surface-elevated)]"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: colors.accent }}
                    />
                    <span
                      className="flex-1 text-[0.98rem]"
                      style={{ color: colors.text }}
                    >
                      {label}
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: colors.muted }}
                    >
                      {value}
                    </span>
                    <span className="text-lg" style={{ color: colors.muted }}>
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <SectionLabel colors={colors}>Recent focus</SectionLabel>
              <div className="space-y-4">
                {focusTopics.map(([label, value]) => (
                  <div key={label}>
                    <div className="mb-2 flex items-center justify-between text-[0.9rem]">
                      <span style={{ color: colors.text }}>{label}</span>
                      <span style={{ color: colors.muted }}>{value}%</span>
                    </div>
                    <div
                      className="h-2 rounded-full"
                      style={{ background: light ? "#E9E3D9" : "#2A211B" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${value}%`,
                          background: colors.accent,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </main>

          <aside className="space-y-8">
            <section>
              <SectionLabel colors={colors}>Account</SectionLabel>
              <div className="border-t" style={{ borderColor: colors.border }}>
                <SettingsRow
                  icon="user"
                  title="Profile information"
                  description="Update your name and email"
                  onClick={() => setEditOpen(true)}
                  colors={colors}
                  light={light}
                />
                <SettingsRow
                  icon="lock"
                  title="Change password"
                  description="Secure your account"
                  onClick={() => setPasswordOpen(true)}
                  colors={colors}
                  light={light}
                />
              </div>
            </section>

            <section>
              <SectionLabel colors={colors}>Preferences</SectionLabel>
              <div className="border-t" style={{ borderColor: colors.border }}>
                <SettingsRow
                  icon="sun"
                  title="Appearance"
                  description="Choose Light, Dark or System"
                  value={light ? "Light" : "Dark"}
                  onClick={() => setAppearanceOpen((open) => !open)}
                  colors={colors}
                  light={light}
                />
                {appearanceOpen && (
                  <div className="border-b py-3">
                    <div className="grid grid-cols-3 gap-2">
                      {themeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setTheme(option.value)}
                          className="rounded-xl border px-2 py-2 text-[0.78rem] font-medium"
                          style={{
                            borderColor:
                              option.value === currentTheme
                                ? colors.accent
                                : colors.border,
                            background:
                              option.value === currentTheme
                                ? colors.elevated
                                : "transparent",
                            color: colors.text,
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <SettingsRow
                  icon="bell"
                  title="Notifications"
                  description="Manage PrepMind notifications"
                  value="On"
                  onClick={() => setNotificationsOpen(true)}
                  colors={colors}
                  light={light}
                />
                <div className="flex items-center gap-3 border-b py-4">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{
                      background: light ? "#F1EEE7" : "#1F150C",
                      color: colors.accent,
                    }}
                  >
                    文
                  </span>
                  <span className="flex-1">
                    <span
                      className="block text-[0.98rem] font-medium"
                      style={{ color: colors.text }}
                    >
                      Language
                    </span>
                    <span
                      className="mt-0.5 block text-[0.82rem]"
                      style={{ color: colors.muted }}
                    >
                      English
                    </span>
                  </span>
                </div>
              </div>
            </section>

            <section
              className="border-t pt-6"
              style={{ borderColor: colors.border }}
            >
              <p
                className="text-base font-medium"
                style={{ color: colors.text }}
              >
                Log out of PrepMind
              </p>
              <p className="mt-1 text-sm" style={{ color: colors.muted }}>
                You can sign back in anytime.
              </p>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate("/login", { replace: true });
                }}
                className="mt-4 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:border-[#D14A4A] hover:text-[#D14A4A]"
                style={{ borderColor: colors.border, color: colors.muted }}
              >
                Log out
              </button>
            </section>
          </aside>
        </div>
      </div>

      {editOpen && (
        <Modal
          title="Edit profile"
          eyebrow="Personal information"
          onClose={() => setEditOpen(false)}
          colors={colors}
        >
          <div className="mt-5 space-y-4">
            {profileError && (
              <p
                role="alert"
                className="rounded-xl border border-[#A84B43]/40 bg-[#A84B43]/10 px-3 py-2 text-sm text-[#C97B70]"
              >
                {profileError}
              </p>
            )}
            {[
              ["Full name", "name"],
              ["Email", "email"],
            ].map(([label, key]) => (
              <div key={key}>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  style={{ color: colors.text }}
                >
                  {label}
                </label>
                <input
                  disabled={key === "email"}
                  value={profile[key]}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border px-3.5 py-3 outline-none"
                  style={{
                    background: light ? "#F7F4EE" : "#17120E",
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="rounded-xl px-4 py-2.5 text-sm"
              style={{ color: colors.muted }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProfileSave}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{
                background: colors.accent,
                color: light ? "#FFFFFF" : "#17130F",
              }}
            >
              Save changes →
            </button>
          </div>
        </Modal>
      )}
      {passwordOpen && (
        <Modal
          title="Change password"
          onClose={() => {
            setPasswordOpen(false);
            setPasswordError("");
            setPasswordSuccess("");
          }}
          colors={colors}
        >
          <div className="mt-5 space-y-4">
            {passwordError && (
              <p
                role="alert"
                className="rounded-xl border border-[#A84B43]/40 bg-[#A84B43]/10 px-3 py-2 text-sm text-[#C97B70]"
              >
                {passwordError}
              </p>
            )}
            {passwordSuccess && (
              <p
                role="status"
                className="rounded-xl border border-[#488456]/40 bg-[#488456]/10 px-3 py-2 text-sm text-[#66B87B]"
              >
                {passwordSuccess}
              </p>
            )}
            {[
              ["Current password", "current"],
              ["New password", "next"],
              ["Confirm password", "confirm"],
            ].map(([label, key]) => (
              <div key={key}>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  style={{ color: colors.text }}
                >
                  {label}
                </label>
                <input
                  type="password"
                  value={password[key]}
                  onChange={(event) =>
                    setPassword((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border px-3.5 py-3 outline-none"
                  style={{
                    background: light ? "#F7F4EE" : "#17120E",
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setPasswordOpen(false);
                setPasswordError("");
                setPasswordSuccess("");
              }}
              className="rounded-xl px-4 py-2.5 text-sm"
              style={{ color: colors.muted }}
            >
              Cancel
            </button>
            <button
              disabled={passwordSubmitting}
              type="button"
              onClick={handlePasswordSave}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{
                background: colors.accent,
                color: light ? "#FFFFFF" : "#17130F",
              }}
            >
              {passwordSubmitting ? "Updating..." : "Update password →"}
            </button>
          </div>
        </Modal>
      )}
      {notificationsOpen && (
        <Modal
          title="Notifications"
          eyebrow="Preferences"
          onClose={() => setNotificationsOpen(false)}
          colors={colors}
        >
          <div className="mt-5 space-y-3">
            {[
              { label: "DBMS Quiz completed — 84%", time: "2m ago" },
              { label: "Notes exported as PDF", time: "1h ago" },
              { label: "New knowledge ready: OS Lecture", time: "Yesterday" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border p-3"
                style={{ borderColor: colors.border }}
              >
                <p className="text-sm" style={{ color: colors.text }}>
                  {item.label}
                </p>
                <p className="mt-1 text-xs" style={{ color: colors.muted }}>
                  {item.time}
                </p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
