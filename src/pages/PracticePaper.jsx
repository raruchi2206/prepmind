import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { KnowledgeSignal } from "../components/KnowledgeSignal";
import { ragApi, knowledgeApi } from "../services/api";
import { generatePracticePaperPDF, generatePracticeSolutionsPDF } from "../utils/pdfGenerator";

function PaperSetup({ theme, sources, onGenerate, loading, error }) {
  const [searchParams] = useSearchParams();
  const initialKs = searchParams.get("knowledge");

  const [selectedKs, setSelectedKs] = useState(
    initialKs || (sources[0]?.id || "")
  );
  const [totalMarks, setTotalMarks] = useState(50);
  const [difficulty, setDifficulty] = useState("Medium");

  useEffect(() => {
    if (sources.length > 0 && !selectedKs) {
      setSelectedKs(sources[0].id);
    }
  }, [sources, selectedKs]);

  const light = theme === "light";
  const border = light
    ? "border-[rgba(65,45,21,0.1)]"
    : "border-[rgba(225,220,201,0.08)]";

  return (
    <div
      className="min-h-screen pt-14 page-shell"
      style={{ background: light ? "#F8F7F3" : "#000" }}
    >
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="animate-fade-in-up">
          <p className="section-label mb-1">EXAMINATION ENGINE</p>
          <h1 className="font-display text-4xl font-light mb-8">
            Practice Paper Setup
          </h1>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div className={`p-5 border rounded-xl ${border} panel`}>
              <p className="section-label mb-3">SELECT KNOWLEDGE SOURCE</p>
              {sources.length === 0 ? (
                <div className="text-sm text-[var(--text-secondary)]">
                  No uploaded knowledge sources found.{" "}
                  <Link to="/knowledge" className="text-amber-500 hover:underline">
                    Upload document →
                  </Link>
                </div>
              ) : (
                <select
                  id="paper-source-select"
                  value={selectedKs}
                  onChange={(e) => setSelectedKs(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)]"
                >
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.type} · {s.metadata?.chunkCount || 0} chunks)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className={`p-5 border rounded-xl ${border} panel`}>
              <p className="section-label mb-3">TOTAL MARKS</p>
              <div className="flex gap-2">
                {[20, 30, 50, 100].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTotalMarks(m)}
                    className={`w-16 h-10 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                      totalMarks === m
                        ? "btn-primary"
                        : "border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)]"
                    }`}
                  >
                    {m}M
                  </button>
                ))}
              </div>
            </div>

            <div className={`p-5 border rounded-xl ${border} panel`}>
              <p className="section-label mb-3">DIFFICULTY</p>
              <div className="flex gap-2">
                {["Easy", "Medium", "Hard", "Mixed"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`px-4 py-2 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                      difficulty === d
                        ? "btn-primary"
                        : "border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)]"
                    }`}
                  >
                    {d.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="generate-paper-btn"
              onClick={() =>
                onGenerate({
                  knowledgeSourceId: selectedKs,
                  totalMarks,
                  difficulty,
                })
              }
              disabled={loading || !selectedKs}
              className="w-full py-4 text-sm font-body tracking-wide rounded-xl btn-primary transition-all disabled:opacity-30 cursor-pointer"
            >
              {loading ? "Generating Structured Exam Paper via RAG..." : "GENERATE PRACTICE PAPER →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaperExperience({
  assessment,
  sourceTitle,
  theme,
  onSubmit,
  submitting,
  onDownloadQuestionPDF,
  onDownloadSolutionsPDF,
}) {
  const [answers, setAnswers] = useState({});
  const [showSolutions, setShowSolutions] = useState(false);
  const [timeLeft, setTimeLeft] = useState(
    (assessment.timeAllowedMinutes || 90) * 60
  );

  const formatTime = (s) =>
    `${Math.floor(s / 3600)
      .toString()
      .padStart(2, "0")}:${Math.floor((s % 3600) / 60)
      .toString()
      .padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  useEffect(() => {
    const t = setInterval(
      () => setTimeLeft((s) => (s > 0 ? s - 1 : 0)),
      1000
    );
    return () => clearInterval(t);
  }, []);

  const light = theme === "light";
  const border = light
    ? "border-[rgba(65,45,21,0.1)]"
    : "border-[rgba(225,220,201,0.08)]";

  const handleFinish = () => {
    const answersList = [];
    (assessment.sections || []).forEach((sec) => {
      (sec.questions || []).forEach((q) => {
        answersList.push({
          questionId: q.id,
          userAnswer: answers[q.id] || "",
        });
      });
    });
    const timeSpent =
      (assessment.timeAllowedMinutes || 90) * 60 - timeLeft;
    onSubmit(answersList, timeSpent);
  };

  return (
    <div
      className="min-h-screen page-shell"
      style={{ background: light ? "#F8F7F3" : "#000" }}
    >
      {/* Top sticky bar */}
      <div
        className="sticky top-0 z-10 px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3"
        style={{
          background: light
            ? "rgba(248,247,243,0.95)"
            : "rgba(0,0,0,0.95)",
          backdropFilter: "blur(8px)",
          borderColor: light
            ? "rgba(65,45,21,0.1)"
            : "rgba(225,220,201,0.08)",
        }}
      >
        <span className="font-display text-sm font-medium truncate max-w-md text-[var(--text-primary)]">
          {assessment.title}
        </span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-[var(--text-secondary)]">
            Total: {assessment.totalMarks} Marks · ⏱ {formatTime(timeLeft)}
          </span>
          <button
            id="download-paper-pdf-top"
            onClick={onDownloadQuestionPDF}
            className="btn btn-secondary btn-sm flex items-center gap-1.5 font-mono text-xs cursor-pointer"
            title="Download printable Question Paper PDF without solutions"
          >
            📥 Question Paper PDF
          </button>
          <button
            id="toggle-solutions-btn"
            onClick={() => setShowSolutions(!showSolutions)}
            className="btn btn-ghost btn-sm font-mono text-xs cursor-pointer"
          >
            {showSolutions ? "Hide Solutions" : "View Solutions"}
          </button>
          {showSolutions && (
            <button
              id="download-solutions-pdf-top"
              onClick={onDownloadSolutionsPDF}
              className="btn btn-primary btn-sm flex items-center gap-1.5 font-mono text-xs cursor-pointer"
            >
              📥 Solutions PDF
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {(assessment.sections || []).map((sec, sIdx) => (
          <div key={sIdx} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="font-display text-xl font-medium text-[var(--text-primary)]">
                {sec.sectionName || `SECTION ${String.fromCharCode(65 + sIdx)}`}
              </h3>
              <div
                className="flex-1 h-px"
                style={{
                  background: light
                    ? "rgba(65,45,21,0.08)"
                    : "rgba(225,220,201,0.06)",
                }}
              />
            </div>
            {sec.instructions && (
              <p className="text-xs font-mono text-[var(--text-secondary)] mb-4">
                {sec.instructions}
              </p>
            )}
            <div className="space-y-4">
              {(sec.questions || []).map((q, qIdx) => {
                const qId = q.id || `${sIdx}-${qIdx}`;
                return (
                  <div
                    key={qId}
                    className={`panel p-6 border rounded-xl ${border}`}
                  >
                    <div className="flex justify-between mb-3 text-[var(--text-secondary)]">
                      <span className="font-mono text-xs font-medium">
                        Q{qIdx + 1} ({q.type})
                      </span>
                      <span className="font-mono text-xs">
                        [{q.marks || sec.marksPerQuestion || 5} marks]
                      </span>
                    </div>
                    <p className="text-sm font-body leading-relaxed mb-4 text-[var(--text-primary)]">
                      {q.question}
                    </p>

                    {q.type === "MCQ" && q.options ? (
                      <div className="space-y-2">
                        {q.options.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() =>
                              setAnswers((prev) => ({ ...prev, [qId]: opt }))
                            }
                            className={`w-full text-left p-3 rounded-lg border text-xs transition-all cursor-pointer ${
                              answers[qId] === opt
                                ? "border-[var(--accent)] bg-[var(--surface-elevated)] ring-1 ring-[var(--accent)]"
                                : `${border} bg-[var(--surface)] hover:bg-[var(--surface-elevated)]`
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        rows={q.marks >= 10 ? 6 : 3}
                        value={answers[qId] || ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [qId]: e.target.value,
                          }))
                        }
                        placeholder="Write your academic response here..."
                        className={`w-full bg-[var(--surface-elevated)] border rounded-xl px-4 py-3 text-xs text-[var(--text-primary)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--ring)] ${border}`}
                      />
                    )}

                    {/* Solutions display if toggled */}
                    {showSolutions && (
                      <div className="mt-4 pt-4 border-t border-[var(--border)] bg-[var(--surface-elevated)] p-4 rounded-xl space-y-2">
                        <p className="text-xs font-medium text-emerald-400">
                          ✓ Expected Solution / Model Answer:
                        </p>
                        <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                          {q.expectedAnswer || q.correctAnswer || "Refer to course reference materials."}
                        </p>
                        {q.rubric && (
                          <p className="text-[11px] font-mono text-[var(--text-secondary)] italic">
                            Marking Rubric: {q.rubric}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex gap-4">
          <button
            id="submit-paper-btn"
            onClick={handleFinish}
            disabled={submitting}
            className="flex-1 py-4 text-sm font-body tracking-wide rounded-xl btn-primary transition-all disabled:opacity-40 cursor-pointer"
          >
            {submitting ? "Evaluating Exam Paper via RAG..." : "SUBMIT FOR AI EVALUATION →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaperResult({ attempt, assessment, sourceTitle, theme, onDownloadSolutionsPDF, onReset }) {
  const light = theme === "light";
  return (
    <div
      className="min-h-screen pt-14 page-shell"
      style={{ background: light ? "#F8F7F3" : "#000" }}
    >
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10 animate-fade-in-up">
          <p className="section-label mb-2">PRACTICE EVALUATION COMPLETE</p>
          <div className="font-display text-8xl font-light mb-2 text-[var(--text-primary)]">
            {attempt.percentage}%
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Score: {attempt.score} / {attempt.totalMarks} Marks
          </p>
        </div>

        <div className="flex justify-center gap-3 mb-8">
          <button
            id="download-solutions-pdf-result"
            onClick={onDownloadSolutionsPDF}
            className="btn btn-primary cursor-pointer flex items-center gap-2"
          >
            📥 Download Solutions PDF
          </button>
        </div>

        <div className="space-y-4 mb-8">
          <h3 className="section-label">Section & Question Breakdown</h3>
          {(attempt.answers || []).map((ans, idx) => (
            <div key={idx} className="panel p-5 border rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-xs text-[var(--text-secondary)]">
                  Question {idx + 1}
                </span>
                <span className="font-mono text-xs text-emerald-400 font-bold">
                  {ans.awardedMarks} / {ans.maxMarks} Marks
                </span>
              </div>
              <p className="text-xs text-[var(--text-primary)] mb-2">
                <strong>Your Submission:</strong> {ans.userAnswer || "(No answer submitted)"}
              </p>
              {ans.feedback && (
                <p className="text-xs text-[var(--text-secondary)] bg-[var(--surface-elevated)] p-2.5 rounded-lg italic border border-[var(--border)]">
                  📝 {ans.feedback}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={onReset} className="btn btn-primary cursor-pointer">
            Create Another Paper →
          </button>
          <Link to="/history" className="btn btn-secondary">
            View in History
          </Link>
          <Link to="/progress" className="btn btn-ghost">
            View Analytics
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PracticePaper({ theme }) {
  const [searchParams] = useSearchParams();
  const initialKs = searchParams.get("knowledge");

  const [sources, setSources] = useState([]);
  const [phase, setPhase] = useState("setup");
  const [assessment, setAssessment] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedKsId, setSelectedKsId] = useState(initialKs || "");

  useEffect(() => {
    async function loadSources() {
      try {
        const res = await knowledgeApi.getAll();
        const list = res?.data?.knowledgeSources || [];
        setSources(list);
        if (list.length > 0 && !selectedKsId) {
          setSelectedKsId(list[0].id);
        }
      } catch (err) {
        console.warn("Could not load knowledge sources:", err.message);
      }
    }
    loadSources();
  }, []);

  const handleGenerate = async ({
    knowledgeSourceId,
    totalMarks,
    difficulty,
  }) => {
    setSelectedKsId(knowledgeSourceId);
    setLoading(true);
    setError("");
    const startTime = Date.now();
    try {
      const res = await ragApi.generatePaper({
        knowledgeSourceIds: [knowledgeSourceId],
        totalMarks,
        difficulty,
      });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      setAssessment({
        ...res?.data,
        generationTimeSeconds: duration,
      });
      setPhase("paper");
    } catch (err) {
      setError(err.message || "Failed to generate practice paper");
    } finally {
      setLoading(false);
    }
  };

  const selectedSource = sources.find((s) => s.id === selectedKsId);
  const sourceTitle = selectedSource?.title || "Knowledge Source";

  const handleDownloadQuestionPDF = () => {
    if (!assessment) return;
    generatePracticePaperPDF(assessment, sourceTitle);
  };

  const handleDownloadSolutionsPDF = () => {
    if (!assessment) return;
    generatePracticeSolutionsPDF(assessment, sourceTitle);
  };

  const handleSubmitAttempt = async (answers, timeSpentSeconds) => {
    if (!assessment?.id) return;
    setSubmitting(true);
    try {
      const res = await ragApi.submitAttempt(assessment.id, {
        answers,
        timeSpentSeconds,
      });
      setAttempt(res?.data);
      setPhase("result");
    } catch (err) {
      setError(err.message || "Failed to submit assessment");
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === "setup") {
    return (
      <PaperSetup
        theme={theme}
        sources={sources}
        onGenerate={handleGenerate}
        loading={loading}
        error={error}
      />
    );
  }

  if (phase === "paper" && assessment) {
    return (
      <PaperExperience
        assessment={assessment}
        sourceTitle={sourceTitle}
        theme={theme}
        onSubmit={handleSubmitAttempt}
        submitting={submitting}
        onDownloadQuestionPDF={handleDownloadQuestionPDF}
        onDownloadSolutionsPDF={handleDownloadSolutionsPDF}
      />
    );
  }

  if (phase === "result" && attempt) {
    return (
      <PaperResult
        attempt={attempt}
        assessment={assessment}
        sourceTitle={sourceTitle}
        theme={theme}
        onDownloadSolutionsPDF={handleDownloadSolutionsPDF}
        onReset={() => {
          setAssessment(null);
          setAttempt(null);
          setPhase("setup");
        }}
      />
    );
  }

  return null;
}
