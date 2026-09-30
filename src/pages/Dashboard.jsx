import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { KnowledgeSignal } from "../components/KnowledgeSignal";
import { useAuth } from "../context/AuthContext";
import { knowledgeApi } from "../services/api";

const recentActivity = [
  {
    title: "DBMS Quiz",
    type: "QUIZ",
    score: 84,
    time: "Today",
    path: "/history",
  },
  {
    title: "Normalization Notes",
    type: "NOTES",
    score: null,
    time: "Yesterday",
    sub: "Generated PDF",
    path: "/history",
  },
  {
    title: "DBMS Viva",
    type: "VIVA",
    score: 82,
    time: "2 days ago",
    path: "/history",
  },
];

const capabilities = [
  {
    label: "SUMMARY",
    sub: "Turn material into a concise summary.",
    icon: "∑",
    path: "/create?mode=summary",
  },
  {
    label: "NOTES",
    sub: "Create structured revision notes.",
    icon: "≡",
    path: "/create?mode=notes",
  },
  {
    label: "QUIZ",
    sub: "Test your understanding.",
    icon: "?",
    path: "/create?mode=quiz",
  },
  {
    label: "PRACTICE PAPER",
    sub: "Generate a complete practice paper.",
    icon: "◻",
    path: "/create?mode=paper",
  },
  {
    label: "VIVA",
    sub: "Practice an oral examination.",
    icon: "◈",
    path: "/create?mode=viva",
  },
  {
    label: "ASK",
    sub: "Ask anything about your knowledge.",
    icon: "⌁",
    path: "/ask",
  },
];

const progress = [
  { label: "Normalization", value: 82 },
  { label: "Transactions", value: 64 },
  { label: "Indexes", value: 78 },
  { label: "SQL", value: 71 },
];

export default function Dashboard({ theme }) {
  const { user } = useAuth();
  const light = theme === "light";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const [knowledgeList, setKnowledgeList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadKnowledge() {
      try {
        const res = await knowledgeApi.getAll();
        setKnowledgeList(res?.data?.knowledgeSources || []);
      } catch (err) {
        console.error("Dashboard failed to load knowledge:", err.message);
      } finally {
        setLoading(false);
      }
    }
    loadKnowledge();
  }, []);

  const totalChunks = knowledgeList.reduce(
    (acc, k) => acc + (k.metadata?.chunkCount || 0),
    0,
  );

  return (
    <div
      className="page-shell"
      style={{ background: light ? "#F8F7F3" : "#000000" }}
    >
      <div className="page-inner">
        <header className="mb-6 animate-fade-in-up">
          <p className="section-label">Dashboard</p>
          <h1 className="page-title mt-4">{greeting}, {user?.name || "Student"}.</h1>
          <p className="page-subtitle mt-3">
            What do you want to prepare today?
          </p>
        </header>

        <section
          className="panel mb-6 p-5 sm:p-6 animate-fade-in-up"
          style={{ background: light ? "#fffdf9" : "var(--surface)" }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-label">
                {knowledgeList.length > 0 ? "Your knowledge is ready" : "Knowledge Base"}
              </p>
              <h2
                className="mt-3 text-3xl leading-tight text-[var(--text-primary)]"
                style={{ fontFamily: "Fraunces, Georgia, serif" }}
              >
                {knowledgeList.length > 0
                  ? "Create from your knowledge."
                  : "Upload your study documents."}
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {knowledgeList.length > 0
                  ? `${knowledgeList.length} ${knowledgeList.length === 1 ? "source" : "sources"} · ${totalChunks} chunks indexed`
                  : "Upload PDF, DOCX, PPTX, or TXT documents to power your AI assessment."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/create" className="btn btn-primary">
                Create →
              </Link>
              <Link to="/knowledge" className="btn btn-secondary">
                Add knowledge
              </Link>
            </div>
          </div>
        </section>

        <section
          className="panel mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up delay-100"
          style={{
            background: light
              ? "rgba(65,45,21,0.04)"
              : "rgba(225,220,201,0.04)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <KnowledgeSignal size={26} animated light={light} />
            <div className="min-w-0">
              <p className="section-label">PrepMind recommendation</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Keep your revision sharp with targeted quizzes and viva drills.
              </p>
            </div>
          </div>
          <Link
            to="/create?mode=quiz"
            className="btn btn-secondary btn-sm whitespace-nowrap"
          >
            Practice quiz →
          </Link>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.95fr]">
          <div className="space-y-6 animate-fade-in-up delay-200">
            <section className="panel p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="section-label">Your knowledge</p>
                <Link
                  to="/knowledge"
                  className="text-[0.62rem] uppercase tracking-[0.15em] text-[var(--text-secondary)] hover:underline"
                >
                  View all →
                </Link>
              </div>

              {loading ? (
                <p className="py-6 text-center text-xs text-[var(--text-secondary)]">
                  Loading knowledge sources...
                </p>
              ) : knowledgeList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-elevated)] p-6 text-center">
                  <p className="text-sm text-[var(--text-primary)] font-medium">
                    No knowledge sources yet
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Upload documents to power assessments and revision.
                  </p>
                  <Link to="/knowledge" className="btn btn-primary btn-sm mt-4 inline-flex">
                    + Add Knowledge
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {knowledgeList.slice(0, 4).map((item) => {
                    const chunkCount = item.metadata?.chunkCount ?? 0;
                    const pageCount = item.metadata?.pageCount ?? 0;
                    const metaText = pageCount > 0 ? `${pageCount} pages · ${chunkCount} chunks` : `${chunkCount} chunks`;

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[var(--text-primary)]">
                              {item.title}
                            </span>
                            <span className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                              {item.type}
                            </span>
                          </div>
                          <p className="mt-2 font-mono text-[0.56rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                            {metaText}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className={`status-pill ${item.status === "READY" ? "ready" : "neutral"}`}>
                            {item.status}
                          </span>
                          <Link to={`/knowledge/${item.id}`} className="btn btn-ghost btn-sm">
                            View
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="panel p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="section-label">Continue preparing</p>
                <Link
                  to="/history"
                  className="text-[0.62rem] uppercase tracking-[0.15em] text-[var(--text-secondary)]"
                >
                  History →
                </Link>
              </div>

              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <Link
                    key={item.title}
                    to={item.path}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3.5 transition-colors hover:bg-[var(--surface-muted)]"
                  >
                    <div>
                      <p className="text-sm text-[var(--text-primary)]">
                        {item.title}
                      </p>
                      <p className="mt-1 font-mono text-[0.56rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        {item.type} · {item.time}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.score ? (
                        <span className="font-display text-xl text-[var(--text-primary)]">
                          {item.score}%
                        </span>
                      ) : (
                        <span className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                          PDF
                        </span>
                      )}
                      <span className="text-base text-[var(--text-secondary)]">
                        →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6 animate-fade-in-up delay-300">
            <section className="panel p-4 sm:p-5">
              <p className="section-label">Your progress</p>
              <div className="mt-4 space-y-4">
                {progress.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm text-[var(--text-primary)]">
                        {item.label}
                      </span>
                      <span className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        {item.value}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--surface-muted)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/progress" className="btn btn-secondary mt-5 w-full">
                View progress
              </Link>
            </section>

            <section className="panel p-4 sm:p-5">
              <p className="section-label">What you can do</p>
              <div className="mt-4 space-y-2">
                {capabilities.map((cap) => (
                  <Link
                    key={cap.label}
                    to={cap.path}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 transition-colors hover:bg-[var(--surface-muted)]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-muted)] font-mono text-base text-[var(--text-secondary)]">
                      {cap.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        {cap.label}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-primary)]">
                        {cap.sub}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
