import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { notificationsApi } from "../services/api";

const POLL_MS = 30000;

function BellIcon() {
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
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

function timeAgo(date) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

const typeTone = {
  SOURCE_READY: "bg-emerald-500",
  GENERATION_COMPLETE: "bg-[var(--accent)]",
  SOURCE_FAILED: "bg-red-500",
  SOURCE_CANCELLED: "bg-[var(--text-secondary)]",
  SOURCE_NEEDS_REVIEW: "bg-amber-500",
};

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [state, setState] = useState("idle"); // idle | loading | ready | error
  const panelRef = useRef(null);

  const refreshCount = useCallback(async () => {
    try {
      const res = await notificationsApi.unreadCount();
      setUnread(res?.data?.unreadCount ?? 0);
    } catch {
      // Keep the last known count; the next poll retries
    }
  }, []);

  const loadList = useCallback(async () => {
    setState("loading");
    try {
      const res = await notificationsApi.list(20);
      setItems(res?.data?.notifications || []);
      setUnread(res?.data?.unreadCount ?? 0);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refreshCount();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [refreshCount]);

  useEffect(() => {
    if (open) loadList();
  }, [open, loadList]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openNotification = async (item) => {
    if (!item.read) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setUnread((count) => Math.max(0, count - 1));
      notificationsApi.markRead(item.id).catch(() => refreshCount());
    }
    setOpen(false);
    if (item.actionUrl) navigate(item.actionUrl);
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {
      refreshCount();
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="icon-button relative"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-1 font-mono text-[0.55rem] font-semibold text-[var(--accent-foreground)]">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl"
          style={{ boxShadow: "var(--shadow-soft)" }}
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between px-3 py-2">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Notifications
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {state === "loading" && items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--text-secondary)]">Loading…</p>
            ) : state === "error" ? (
              <div className="px-3 py-6 text-center text-sm text-[var(--text-secondary)]">
                Couldn't load notifications.{" "}
                <button type="button" onClick={loadList} className="underline">
                  Retry
                </button>
              </div>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--text-secondary)]">
                No notifications yet. You'll be notified when uploads finish or study material is generated.
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openNotification(item)}
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[var(--surface-elevated)]"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read ? "bg-transparent" : typeTone[item.type] || "bg-[var(--accent)]"}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className={`block text-sm ${item.read ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]"}`}>
                      {item.title}
                    </span>
                    {item.message && (
                      <span className="mt-0.5 block line-clamp-2 text-xs text-[var(--text-secondary)]">{item.message}</span>
                    )}
                    <span className="mt-1 block font-mono text-[0.6rem] text-[var(--text-secondary)]">
                      {timeAgo(item.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
