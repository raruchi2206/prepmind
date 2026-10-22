import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { KnowledgeSignal } from "./KnowledgeSignal";
import { useAuth } from "../context/AuthContext";
import { NotificationBell } from "./NotificationBell";

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56" />
    </svg>
  );
}

const sidebarTools = [
  { label: "Summary", path: "/summary", icon: "◎" },
  { label: "Notes", path: "/notes", icon: "≡" },
  { label: "Quiz", path: "/quiz", icon: "◇" },
  { label: "Practice paper", path: "/practice-paper", icon: "□" },
  { label: "Viva", path: "/viva", icon: "◈" },
  { label: "Ask PrepMind", path: "/ask", icon: "⌁" },
];

function MobileSidebar({ open, onClose, links, isActive, user, initials, light, onThemeToggle }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate("/login");
  };

  const itemClass = (active) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.92rem] font-medium transition-colors ${
      active
        ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
        : "text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
    }`;

  return (
    <div
      className={`fixed inset-0 z-[60] md:hidden ${open ? "visible" : "invisible"}`}
      aria-hidden={!open}
      inert={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        className={`absolute right-0 top-0 flex h-full w-[min(20rem,85vw)] flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-[72px] items-center justify-between border-b border-[var(--border)] px-5">
          <Link to="/dashboard" onClick={onClose} className="flex items-center gap-3">
            <KnowledgeSignal size={18} light={light} animated />
            <span className="font-display text-sm uppercase tracking-[0.18em]">PrepMind</span>
          </Link>
          <button type="button" onClick={onClose} className="icon-button" aria-label="Close menu">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <Link
            to="/profile"
            onClick={onClose}
            className="mb-4 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-[0.75rem] font-semibold text-[var(--accent-foreground)]">
              {user?.avatar || initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-[var(--text-primary)]">
                {user?.name || "Profile"}
              </span>
              <span className="block truncate text-xs text-[var(--text-secondary)]">
                {user?.email || "View profile"}
              </span>
            </span>
          </Link>

          <p className="section-label px-3 pb-2">Navigate</p>
          <nav className="space-y-1">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={onClose}
                className={itemClass(isActive(link.path))}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="section-label px-3 pb-2 pt-6">Study tools</p>
          <nav className="space-y-1">
            {sidebarTools.map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                onClick={onClose}
                className={itemClass(isActive(tool.path))}
              >
                <span className="w-4 text-center text-[var(--text-secondary)]">{tool.icon}</span>
                {tool.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="space-y-2 border-t border-[var(--border)] p-4">
          <Link to="/create" onClick={onClose} className="btn btn-primary w-full justify-center">
            Create →
          </Link>
          <div className="flex gap-2">
            <button type="button" onClick={onThemeToggle} className="btn btn-ghost btn-sm flex-1">
              {light ? "Dark mode" : "Light mode"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-ghost btn-sm flex-1 hover:text-red-400"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export function Navigation({ theme, onThemeToggle }) {
  const location = useLocation();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const light = theme === "light";
  const links = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Knowledge", path: "/knowledge" },
    { label: "History", path: "/history" },
    { label: "Progress", path: "/progress" },
  ];
  const isActive = (path) => location.pathname.startsWith(path);

  // Close the sidebar whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);
  const name = user?.name || "Profile";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
    <nav
      className="nav-shell fixed left-0 right-0 top-0 z-50 border-b"
      style={{
        background: light ? "rgba(248,247,243,0.9)" : "rgba(13,10,8,0.9)",
        borderColor: "var(--border)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full border"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface-elevated)",
            }}
          >
            <KnowledgeSignal size={18} light={light} animated />
          </div>
          <span className="font-display text-sm tracking-[0.18em] uppercase">
            PrepMind
          </span>
        </Link>
        <div className="hidden items-center gap-2 md:flex">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="nav-link"
              style={{
                background: location.pathname.startsWith(link.path)
                  ? "var(--accent)"
                  : "transparent",
                color: location.pathname.startsWith(link.path)
                  ? "var(--accent-foreground)"
                  : "var(--text-primary)",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onThemeToggle}
            className="icon-button"
            aria-label="Toggle theme"
          >
            {light ? (
              <SunIcon />
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
              </svg>
            )}
          </button>
          <NotificationBell />
          <Link to="/create" className="nav-cta hidden sm:inline-flex">
            Create →
          </Link>
          <Link
            to="/profile"
            className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1.5 text-left transition-colors hover:border-[var(--ring)]"
            aria-label="Open profile"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--accent)] text-[0.72rem] font-semibold text-[var(--accent-foreground)]">
              {user?.avatar || initials}
            </span>
            <span className="hidden text-[0.92rem] font-medium text-[var(--text-primary)] xl:inline-block">
              {name.split(" ")[0]}
            </span>
            <span className="hidden text-[var(--text-secondary)] sm:block">
              ↗
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="icon-button md:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <span className="flex flex-col gap-1.5">
              <span className="block h-px w-4 bg-current" />
              <span className="block h-px w-4 bg-current" />
              <span className="block h-px w-4 bg-current" />
            </span>
          </button>
        </div>
      </div>
    </nav>
    <MobileSidebar
      open={menuOpen}
      onClose={() => setMenuOpen(false)}
      links={links}
      isActive={isActive}
      user={user}
      initials={initials}
      light={light}
      onThemeToggle={onThemeToggle}
    />
    </>
  );
}
