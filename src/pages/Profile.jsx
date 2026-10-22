import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi, notificationsApi, progressApi } from "../services/api";

const PASSWORD_RULES = [
  { test: (v) => v.length >= 8, label: "At least 8 characters" },
  { test: (v) => /[A-Z]/.test(v), label: "An uppercase letter" },
  { test: (v) => /[a-z]/.test(v), label: "A lowercase letter" },
  { test: (v) => /[0-9]/.test(v), label: "A number" },
  { test: (v) => /[^A-Za-z0-9]/.test(v), label: "A special character" },
];

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--ring)] focus:outline-none";

function Field({ id, label, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[0.7rem] text-[var(--text-secondary)]">{hint}</p>}
    </div>
  );
}

function Feedback({ error, success }) {
  if (error) {
    return (
      <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
        {success}
      </p>
    );
  }
  return null;
}

function ProfileForm({ user, updateProfile }) {
  const [form, setForm] = useState({ name: user?.name || "", username: user?.username || "", email: user?.email || "" });
  const [currentPassword, setCurrentPassword] = useState("");
  const [state, setState] = useState({ saving: false, error: "", success: "" });

  useEffect(() => {
    setForm({ name: user?.name || "", username: user?.username || "", email: user?.email || "" });
  }, [user?.name, user?.username, user?.email]);

  const emailChanged = form.email.trim().toLowerCase() !== (user?.email || "").toLowerCase();
  const changes = {};
  if (form.name.trim() && form.name.trim() !== user?.name) changes.name = form.name.trim();
  if (form.username.trim() && form.username.trim().toLowerCase() !== user?.username) changes.username = form.username.trim();
  if (emailChanged) changes.email = form.email.trim();
  const dirty = Object.keys(changes).length > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!dirty) return;
    if (emailChanged && !currentPassword) {
      setState({ saving: false, error: "Enter your current password to change your email.", success: "" });
      return;
    }
    setState({ saving: true, error: "", success: "" });
    try {
      await updateProfile(emailChanged ? { ...changes, currentPassword } : changes);
      setCurrentPassword("");
      setState({ saving: false, error: "", success: "Profile updated." });
    } catch (err) {
      setState({ saving: false, error: err.message || "Could not update your profile.", success: "" });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="profile-name" label="Display name">
          <input
            id="profile-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            minLength={2}
            maxLength={80}
            className={inputClass}
            autoComplete="name"
          />
        </Field>
        <Field id="profile-username" label="Username" hint="Lowercase letters, numbers, dots, dashes or underscores.">
          <input
            id="profile-username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            minLength={3}
            maxLength={32}
            className={inputClass}
            autoComplete="username"
          />
        </Field>
      </div>
      <Field id="profile-email" label="Email address" hint="Used to sign in and to reset your password.">
        <input
          id="profile-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={inputClass}
          autoComplete="email"
          required
        />
      </Field>
      {emailChanged && (
        <Field id="profile-current-password" label="Current password" hint="Required to change your email address.">
          <input
            id="profile-current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
            autoComplete="current-password"
          />
        </Field>
      )}
      <Feedback error={state.error} success={state.success} />
      <button type="submit" disabled={!dirty || state.saving} className="btn btn-primary disabled:opacity-50">
        {state.saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [state, setState] = useState({ saving: false, error: "", success: "" });
  const unmet = PASSWORD_RULES.filter((rule) => !rule.test(form.next));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.current) {
      setState({ saving: false, error: "Enter your current password.", success: "" });
      return;
    }
    if (unmet.length > 0) {
      setState({ saving: false, error: `New password needs: ${unmet.map((r) => r.label.toLowerCase()).join(", ")}.`, success: "" });
      return;
    }
    if (form.next !== form.confirm) {
      setState({ saving: false, error: "New passwords do not match.", success: "" });
      return;
    }
    setState({ saving: true, error: "", success: "" });
    try {
      await authApi.changePassword({
        currentPassword: form.current,
        newPassword: form.next,
        confirmPassword: form.confirm,
      });
      setForm({ current: "", next: "", confirm: "" });
      setState({
        saving: false,
        error: "",
        success: "Password changed. Other devices have been signed out.",
      });
    } catch (err) {
      setState({ saving: false, error: err.message || "Could not change your password.", success: "" });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field id="password-current" label="Current password">
        <input
          id="password-current"
          type="password"
          value={form.current}
          onChange={(e) => setForm({ ...form, current: e.target.value })}
          className={inputClass}
          autoComplete="current-password"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="password-new" label="New password">
          <input
            id="password-new"
            type="password"
            value={form.next}
            onChange={(e) => setForm({ ...form, next: e.target.value })}
            className={inputClass}
            autoComplete="new-password"
          />
        </Field>
        <Field id="password-confirm" label="Confirm new password">
          <input
            id="password-confirm"
            type="password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            className={inputClass}
            autoComplete="new-password"
          />
        </Field>
      </div>
      {form.next && (
        <ul className="grid gap-1 text-[0.72rem] sm:grid-cols-2">
          {PASSWORD_RULES.map((rule) => (
            <li key={rule.label} className={rule.test(form.next) ? "text-emerald-400" : "text-[var(--text-secondary)]"}>
              {rule.test(form.next) ? "✓" : "○"} {rule.label}
            </li>
          ))}
        </ul>
      )}
      <Feedback error={state.error} success={state.success} />
      <button type="submit" disabled={state.saving} className="btn btn-primary disabled:opacity-50">
        {state.saving ? "Updating…" : "Change password"}
      </button>
    </form>
  );
}

export default function Profile({ theme, onThemeToggle, onSetTheme }) {
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useAuth();
  const light = theme === "light";
  const [stats, setStats] = useState(null);
  const [statsState, setStatsState] = useState("loading");
  const [unread, setUnread] = useState(null);
  const [notifMessage, setNotifMessage] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    progressApi
      .get()
      .then((res) => {
        setStats(res?.data?.totals || null);
        setStatsState("ready");
      })
      .catch(() => setStatsState("error"));
    notificationsApi
      .unreadCount()
      .then((res) => setUnread(res?.data?.unreadCount ?? 0))
      .catch(() => setUnread(null));
  }, []);

  const initials = (user?.name || "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const setTheme = (value) => {
    if (onSetTheme) onSetTheme(value);
    else if (value !== (light ? "light" : "dark")) onThemeToggle();
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setUnread(0);
      setNotifMessage("All notifications marked as read.");
    } catch (err) {
      setNotifMessage(err.message || "Could not update notifications.");
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const statTiles = [
    { label: "Ready sources", value: stats?.sourcesReady, to: "/knowledge" },
    { label: "Quizzes completed", value: stats?.quizzesCompleted, to: "/progress" },
    { label: "Quiz accuracy", value: stats?.accuracy == null ? "—" : `${stats.accuracy}%`, to: "/progress" },
    {
      label: "Study items created",
      value: stats ? stats.summaries + stats.notes + stats.quizzesGenerated + stats.practicePapers + stats.vivas : undefined,
      to: "/history",
    },
  ];

  return (
    <div className="page-shell" style={{ background: light ? "#F8F7F3" : "#000000" }}>
      <div className="page-inner max-w-5xl">
        <div className="mb-8 animate-fade-in-up">
          <p className="section-label">Account</p>
          <h1 className="page-title mt-3">Profile</h1>
        </div>

        <section className="panel flex flex-col gap-5 p-6 animate-fade-in-up sm:flex-row sm:items-center">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--accent)] text-xl font-semibold text-[var(--accent-foreground)]">
            {user?.avatar || initials}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="break-words font-display text-2xl text-[var(--text-primary)]">{user?.name}</h2>
            <p className="mt-1 break-all text-sm text-[var(--text-secondary)]">
              @{user?.username} · {user?.email}
            </p>
            {user?.createdAt && (
              <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </p>
            )}
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 animate-fade-in-up lg:grid-cols-4">
          {statTiles.map((tile) => (
            <Link key={tile.label} to={tile.to} className="panel p-4 transition-colors hover:border-[var(--ring)]">
              <p className="font-display text-3xl text-[var(--text-primary)]">
                {statsState === "loading" ? (
                  <span className="inline-block h-8 w-12 animate-pulse rounded bg-[var(--surface-elevated)]" />
                ) : statsState === "error" ? (
                  "—"
                ) : (
                  (tile.value ?? 0)
                )}
              </p>
              <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                {tile.label}
              </p>
            </Link>
          ))}
        </section>
        {statsState === "error" && (
          <p className="mt-2 text-xs text-[var(--text-secondary)]">Study statistics are unavailable right now.</p>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="panel p-6">
            <p className="section-label">Profile information</p>
            <div className="mt-5">
              <ProfileForm user={user} updateProfile={updateProfile} />
            </div>
          </section>

          <section className="panel p-6">
            <p className="section-label">Password</p>
            <div className="mt-5">
              <PasswordForm />
            </div>
          </section>

          <section className="panel p-6">
            <p className="section-label">Appearance</p>
            <div className="mt-5 flex gap-2" role="group" aria-label="Theme">
              {[
                { label: "Light", value: "light" },
                { label: "Dark", value: "dark" },
              ].map((option) => {
                const active = (light ? "light" : "dark") === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    aria-pressed={active}
                    className={`btn btn-sm flex-1 ${active ? "btn-primary" : "btn-ghost"}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel p-6">
            <p className="section-label">Notifications</p>
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              PrepMind notifies you when uploads finish, fail or need review, and when generated study material is ready.
            </p>
            <p className="mt-3 text-sm text-[var(--text-primary)]">
              {unread == null ? "Unread count unavailable." : `${unread} unread notification${unread === 1 ? "" : "s"}.`}
            </p>
            {notifMessage && <p className="mt-2 text-xs text-[var(--text-secondary)]">{notifMessage}</p>}
            <button
              type="button"
              onClick={markAllRead}
              disabled={!unread}
              className="btn btn-secondary btn-sm mt-4 disabled:opacity-50"
            >
              Mark all as read
            </button>
          </section>
        </div>

        <section className="panel mt-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-medium text-[var(--text-primary)]">Log out of PrepMind</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Signs you out on every device. You can sign back in anytime.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="btn btn-ghost hover:border-red-400 hover:text-red-400 disabled:opacity-50"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </section>
      </div>
    </div>
  );
}
