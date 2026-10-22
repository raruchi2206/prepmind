import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { progressApi } from "../services/api";
import { ActivityChart, ScoreTrendChart, SourcePerformanceChart } from "../components/StudyCharts";

const typeLabels = {
  QUIZ: "Quiz",
  PRACTICE_PAPER: "Practice paper",
  VIVA: "Viva",
  SUMMARY: "Summary",
  NOTES: "Notes",
};

const generatedPaths = {
  SUMMARY: "/summary",
  NOTES: "/notes",
  QUIZ: "/quiz",
  PRACTICE_PAPER: "/practice-paper",
  VIVA: "/viva",
};

function StatTile({ label, value, sub }) {
  return (
    <div className="panel p-4">
      <p className="font-display text-3xl text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">{label}</p>
      {sub && <p className="mt-1 text-xs text-[var(--text-secondary)]">{sub}</p>}
    </div>
  );
}

export default function Progress({ theme }) {
  const light = theme === "light";
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await progressApi.get();
      setData(res?.data || null);
      setState("ready");
    } catch (err) {
      setError(err.message || "Could not load your progress.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const t = data?.totals;
  const hasAttempts = (t?.attempts || 0) > 0;
  const hasAnyActivity = hasAttempts || (data?.activityByDay || []).some((d) => d.generated > 0);

  return (
    <div className="page-shell" style={{ background: light ? "#F8F7F3" : "#000000" }}>
      <div className="page-inner">
        <div className="mb-8 animate-fade-in-up">
          <p className="section-label">Progress</p>
          <h1 className="page-title mt-3">Your study progress</h1>
          <p className="page-subtitle mt-3">Measured from your saved assessments and generated material.</p>
        </div>

        {state === "loading" ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="panel h-24 animate-pulse p-4" />
            ))}
          </div>
        ) : state === "error" ? (
          <div className="panel p-10 text-center" role="alert">
            <h3 className="font-display text-2xl text-[var(--text-primary)]">Progress unavailable</h3>
            <p className="mt-2 text-sm text-red-400">{error}</p>
            <button type="button" onClick={load} className="btn btn-primary mt-6">
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in-up">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile
                label="Quiz accuracy"
                value={t.accuracy == null ? "—" : `${t.accuracy}%`}
                sub={t.questionsAnswered ? `${t.correctAnswers} of ${t.questionsAnswered} answered correctly` : "No quiz answers yet"}
              />
              <StatTile
                label="Average score"
                value={t.averageScore == null ? "—" : `${t.averageScore}%`}
                sub={`${t.attempts} attempt${t.attempts === 1 ? "" : "s"} across all assessments`}
              />
              <StatTile
                label="Quizzes completed"
                value={t.quizzesCompleted}
                sub={t.studyMinutes ? `${t.studyMinutes} min spent on assessments` : null}
              />
              <StatTile
                label="Ready sources"
                value={t.sourcesReady}
                sub={`${t.sources} total · ${t.youtubeSources} YouTube`}
              />
            </div>

            <div className="panel grid grid-cols-2 gap-4 p-5 sm:grid-cols-5">
              {[
                ["Summaries", t.summaries],
                ["Notes", t.notes],
                ["Quizzes", t.quizzesGenerated],
                ["Practice papers", t.practicePapers],
                ["Viva sets", t.vivas],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="font-display text-2xl text-[var(--text-primary)]">{value}</p>
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">{label}</p>
                </div>
              ))}
            </div>

            {!hasAnyActivity ? (
              <div className="panel p-10 text-center">
                <h3 className="font-display text-2xl text-[var(--text-primary)]">No study activity yet</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-secondary)]">
                  Generate study material and take a quiz. Your scores, activity and per-source performance will appear here.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Link to="/create" className="btn btn-primary">
                    Create study material
                  </Link>
                  <Link to="/knowledge" className="btn btn-secondary">
                    Add knowledge
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <ActivityChart days={data.activityByDay} />
                {hasAttempts ? (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <ScoreTrendChart points={data.scoreTrend} />
                    {data.topicPerformance.length > 0 ? (
                      <SourcePerformanceChart rows={data.topicPerformance} />
                    ) : (
                      <div className="panel p-5 text-sm text-[var(--text-secondary)]">
                        Per-source performance appears once your attempts are linked to a knowledge source.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="panel p-6 text-sm text-[var(--text-secondary)]">
                    Score trends and per-source performance appear after your first quiz, practice paper or viva attempt.{" "}
                    <Link to="/create?mode=quiz" className="text-[var(--text-primary)] underline">
                      Take a quiz
                    </Link>
                  </div>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                  <section className="panel p-5">
                    <p className="section-label mb-3">Recent attempts</p>
                    {data.recentAttempts.length === 0 ? (
                      <p className="text-sm text-[var(--text-secondary)]">No attempts yet.</p>
                    ) : (
                      <ul className="divide-y divide-[var(--border)]">
                        {data.recentAttempts.map((a) => (
                          <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                            <span className="min-w-0">
                              <span className="block truncate text-[var(--text-primary)]">{a.title}</span>
                              <span className="text-xs text-[var(--text-secondary)]">
                                {typeLabels[a.type] || a.type} · {new Date(a.date).toLocaleString()}
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              <span className="block text-[var(--text-primary)]">{a.percentage}%</span>
                              <span className="text-xs text-[var(--text-secondary)]">
                                {a.score}/{a.totalMarks}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section className="panel p-5">
                    <p className="section-label mb-3">Recently generated</p>
                    {data.recentGenerated.length === 0 ? (
                      <p className="text-sm text-[var(--text-secondary)]">Nothing generated yet.</p>
                    ) : (
                      <ul className="divide-y divide-[var(--border)]">
                        {data.recentGenerated.map((g) => (
                          <li key={g.id} className="py-2.5 text-sm">
                            <Link
                              to={g.sourceId && generatedPaths[g.type] ? `${generatedPaths[g.type]}?knowledge=${g.sourceId}` : "/history"}
                              className="flex items-center justify-between gap-3 hover:text-[var(--text-primary)]"
                            >
                              <span className="min-w-0 truncate text-[var(--text-primary)]">{g.title}</span>
                              <span className="shrink-0 text-xs text-[var(--text-secondary)]">
                                {typeLabels[g.type] || g.type} · {new Date(g.date).toLocaleDateString()}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
