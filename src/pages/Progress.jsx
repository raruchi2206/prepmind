import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { progressApi } from "../services/api";

function AnimatedBar({ val, light, delay = 0 }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(val), delay);
    return () => clearTimeout(t);
  }, [val, delay]);

  const color = val >= 80 ? "#6BA37A" : val >= 65 ? "#E1DCC9" : "#C17C74";
  return (
    <div
      className="h-1.5 rounded-full overflow-hidden"
      style={{
        background: light
          ? "rgba(65,45,21,0.08)"
          : "rgba(225,220,201,0.08)",
      }}
    >
      <div
        className="h-full rounded-full transition-all duration-1000"
        style={{ width: `${w}%`, background: color }}
      />
    </div>
  );
}

export default function Progress({ theme }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const light = theme === "light";
  const border = light
    ? "border-[rgba(65,45,21,0.1)]"
    : "border-[rgba(225,220,201,0.08)]";
  const sub = light
    ? "text-[rgba(0,0,0,0.4)]"
    : "text-[rgba(225,220,201,0.4)]";

  useEffect(() => {
    async function loadProgress() {
      try {
        setLoading(true);
        setError("");
        const res = await progressApi.get();
        setData(res?.data || null);
      } catch (err) {
        setError(err.message || "Failed to load progress metrics");
      } finally {
        setLoading(false);
      }
    }
    loadProgress();
  }, []);

  const stats = [
    {
      label: "Average Score",
      val: data?.averageScore ? `${data.averageScore}%` : "—",
      sub: "Across all assessment attempts",
    },
    {
      label: "Knowledge Sources",
      val: String(data?.sourcesCount ?? 0),
      sub: "Active indexed documents",
    },
    {
      label: "Quizzes Attempted",
      val: String(data?.quizzesAttempted ?? 0),
      sub: "Assessments evaluated",
    },
    {
      label: "Generated Artifacts",
      val: String(data?.generatedCount ?? 0),
      sub: "Summaries, notes & papers",
    },
  ];

  return (
    <div
      className="min-h-screen pt-14"
      style={{ background: light ? "#F8F7F3" : "#000" }}
    >
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10 animate-fade-in-up">
          <p className="section-label mb-1">REAL-TIME ANALYTICS</p>
          <h1 className="font-display text-4xl font-light text-[var(--text-primary)]">
            Your Preparation Progress
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Data aggregated from your actual knowledge ingestion, quizzes, and practice attempts.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in-up">
          {stats.map((s, i) => (
            <div key={i} className="panel p-6 border rounded-xl">
              <p className="font-display text-3xl font-light mb-1 text-[var(--text-primary)]">
                {s.val}
              </p>
              <p className="text-xs font-medium text-[var(--text-primary)] mb-0.5">
                {s.label}
              </p>
              <p className={`text-[10px] font-mono ${sub}`}>{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Assessment Attempts */}
          <div className="lg:col-span-2">
            <p className="section-label mb-4">RECENT ATTEMPTS & SCORES</p>
            <div className="panel p-6 border rounded-xl space-y-4">
              {loading ? (
                <p className="text-xs text-[var(--text-secondary)]">
                  Loading performance data...
                </p>
              ) : !data?.recentScores || data.recentScores.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[var(--text-secondary)]">
                    No assessments attempted yet.
                  </p>
                  <Link to="/quiz" className="btn btn-primary btn-sm mt-4 inline-block">
                    Take your first quiz →
                  </Link>
                </div>
              ) : (
                data.recentScores.map((scoreItem, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1.5 text-xs">
                      <p className="font-medium text-[var(--text-primary)] truncate max-w-xs">
                        {scoreItem.title}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                          {scoreItem.score}/{scoreItem.totalMarks}
                        </span>
                        <span className="font-mono text-xs text-[var(--text-primary)]">
                          {scoreItem.percentage}%
                        </span>
                      </div>
                    </div>
                    <AnimatedBar
                      val={scoreItem.percentage}
                      light={light}
                      delay={idx * 60}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <p className="section-label mb-4">STUDY SUITE</p>
            <div className="panel p-5 border rounded-xl space-y-3">
              <Link to="/create" className="btn btn-primary w-full text-xs text-center block">
                + Create New Content
              </Link>
              <Link to="/ask" className="btn btn-secondary w-full text-xs text-center block">
                Ask PrepMind AI
              </Link>
              <Link to="/knowledge" className="btn btn-ghost w-full text-xs text-center block">
                Manage Documents
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
