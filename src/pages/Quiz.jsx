import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { KnowledgeSignal } from "../components/KnowledgeSignal";
import { ragApi, knowledgeApi } from "../services/api";
import {
  generateQuizQuestionPDF,
  generateQuizResultPDF,
} from "../utils/pdfGenerator";

function QuizSetup({ theme, sources, onGenerate, loading, error }) {
  const [searchParams] = useSearchParams();
  const initialKs = searchParams.get("knowledge");

  const [selectedKs, setSelectedKs] = useState(
    initialKs || sources[0]?.id || "",
  );
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState("Medium");
  const [qType, setQType] = useState("MCQ");

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
          <p className="section-label mb-1">RAG ASSESSMENT</p>
          <h1 className="font-display text-4xl font-light mb-8">
            Create AI Quiz
          </h1>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div className={`p-5 border rounded-xl ${border} panel`}>
              <p className="section-label mb-3">SELECT KNOWLEDGE SOURCE</p>
              {sources.length === 0 ? (
                <div className="text-sm text-[var(--text-secondary)]">
                  No uploaded knowledge sources found.{" "}
                  <Link
                    to="/knowledge"
                    className="text-amber-500 hover:underline font-medium"
                  >
                    Upload document →
                  </Link>
                </div>
              ) : (
                <select
                  id="quiz-source-select"
                  value={selectedKs}
                  onChange={(e) => setSelectedKs(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)]"
                >
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.type} · {s.metadata?.chunkCount || 0}{" "}
                      chunks)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className={`p-5 border rounded-xl ${border} panel`}>
              <p className="section-label mb-3">NUMBER OF QUESTIONS</p>
              <div className="flex gap-2">
                {[3, 5, 8, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(n)}
                    className={`w-14 h-10 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                      count === n
                        ? "btn-primary"
                        : "border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className={`p-5 border rounded-xl ${border} panel`}>
              <p className="section-label mb-3">DIFFICULTY LEVEL</p>
              <div className="flex gap-2">
                {["Easy", "Medium", "Hard"].map((d) => (
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

            <div className={`p-5 border rounded-xl ${border} panel`}>
              <p className="section-label mb-3">QUESTION TYPE</p>
              <div className="flex gap-2">
                {["MCQ", "True/False", "Mixed"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setQType(t)}
                    className={`px-4 py-2 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                      qType === t
                        ? "btn-primary"
                        : "border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)]"
                    }`}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="create-quiz-submit-btn"
              onClick={() =>
                onGenerate({
                  knowledgeSourceId: selectedKs,
                  questionCount: count,
                  difficulty,
                  questionType: qType,
                  regenerate: true,
                })
              }
              disabled={loading || !selectedKs}
              className="w-full py-4 text-sm font-body tracking-wide rounded-xl btn-primary transition-all disabled:opacity-30 cursor-pointer"
            >
              {loading ? "Generating Quiz via RAG..." : "CREATE QUIZ →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuizReady({
  assessment,
  sourceTitle,
  theme,
  onStartQuiz,
  onDownloadPDF,
  onReset,
}) {
  const light = theme === "light";
  const border = light
    ? "border-[rgba(65,45,21,0.1)]"
    : "border-[rgba(225,220,201,0.08)]";

  const totalQuestions = assessment.questions?.length || 0;

  return (
    <div
      className="min-h-screen pt-14 page-shell"
      style={{ background: light ? "#F8F7F3" : "#000" }}
    >
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-8 animate-fade-in-up">
          <KnowledgeSignal size={70} animated light={light} />
          <p className="section-label mt-6 mb-2">ASSESSMENT GENERATED</p>
          <h1 className="font-display text-4xl font-light text-[var(--text-primary)]">
            Quiz Ready
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Your custom assessment has been synthesized from {sourceTitle}
          </p>
        </div>

        <div
          className={`p-6 border rounded-2xl ${border} panel mb-8 space-y-4 animate-fade-in-up`}
        >
          <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
            <span className="text-xs font-mono text-[var(--text-secondary)]">
              TITLE
            </span>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {assessment.title}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
            <span className="text-xs font-mono text-[var(--text-secondary)]">
              SOURCE
            </span>
            <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-xs">
              {sourceTitle}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
            <span className="text-xs font-mono text-[var(--text-secondary)]">
              DIFFICULTY
            </span>
            <span className="text-sm font-mono text-[var(--accent)]">
              {assessment.difficulty}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-xs font-mono text-[var(--text-secondary)]">
              TOTAL QUESTIONS
            </span>
            <span className="text-sm font-mono font-bold text-[var(--text-primary)]">
              {totalQuestions}
            </span>
          </div>
        </div>

        <div className="space-y-3 animate-fade-in-up">
          <button
            id="take-quiz-btn"
            onClick={onStartQuiz}
            className="btn btn-primary w-full py-4 text-base cursor-pointer"
          >
            TAKE QUIZ NOW →
          </button>
          <button
            id="download-quiz-paper-pdf-btn"
            onClick={onDownloadPDF}
            className="btn btn-secondary w-full py-3.5 text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            📥 DOWNLOAD QUESTION PAPER PDF
          </button>
          <button
            onClick={onReset}
            className="btn btn-ghost w-full py-2.5 text-xs text-[var(--text-secondary)] cursor-pointer"
          >
            ← Back to Quiz Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

function isOptionMatch(userOpt, correctAns, options = []) {
  if (!userOpt || !correctAns) return false;
  const u = String(userOpt).trim().toLowerCase();
  const c = String(correctAns).trim().toLowerCase();
  if (u === c) return true;

  const letterMap = { a: 0, b: 1, c: 2, d: 3, e: 4 };
  if (letterMap[c] !== undefined && options[letterMap[c]]) {
    if (u === String(options[letterMap[c]]).trim().toLowerCase()) return true;
  }
  if (letterMap[u] !== undefined && options[letterMap[u]]) {
    if (c === String(options[letterMap[u]]).trim().toLowerCase()) return true;
  }
  return false;
}

function QuizExperience({ assessment, theme, onSubmit, submitting }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(
    (assessment.timeAllowedMinutes || 10) * 60,
  );

  useEffect(() => {
    const t = setInterval(() => setTimeLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const questions = assessment.questions || [];
  const q = questions[current] || {};
  const selected = answers[current] ?? answers[q.id];
  const isAnswered = selected !== undefined && selected !== "";
  const isCorrect = isAnswered && isOptionMatch(selected, q.correctAnswer, q.options);

  const progress =
    questions.length > 0 ? ((current + 1) / questions.length) * 100 : 0;
  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const light = theme === "light";
  const border = light
    ? "border-[rgba(65,45,21,0.1)]"
    : "border-[rgba(225,220,201,0.08)]";

  const handleSelectOption = (opt) => {
    setAnswers((prev) => ({
      ...prev,
      [current]: opt,
      ...(q.id ? { [q.id]: opt } : {}),
    }));
  };

  const handleFinish = () => {
    const answersPayload = questions.map((item, idx) => ({
      questionId: item.id || item._id || idx,
      userAnswer: answers[idx] ?? answers[item.id] ?? answers[item._id] ?? "",
    }));
    const timeSpent = (assessment.timeAllowedMinutes || 10) * 60 - timeLeft;
    onSubmit(answersPayload, timeSpent);
  };

  return (
    <div
      className="min-h-screen flex flex-col page-shell"
      style={{ background: light ? "#F8F7F3" : "#000" }}
    >
      <div
        className="px-6 py-4 border-b flex items-center justify-between"
        style={{
          borderColor: light ? "rgba(65,45,21,0.1)" : "rgba(225,220,201,0.08)",
        }}
      >
        <span className="font-display text-sm font-light">
          {assessment.title}
        </span>
        <div className="flex items-center gap-6">
          <span className="font-mono text-xs opacity-40">
            Q {current + 1} / {questions.length}
          </span>
          <span className="font-mono text-xs opacity-60">
            ⏱ {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      <div
        className="h-1 w-full"
        style={{
          background: light ? "rgba(65,45,21,0.08)" : "rgba(225,220,201,0.06)",
        }}
      >
        <div
          className="h-full transition-all duration-500 bg-[var(--accent)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] tracking-widest text-[var(--text-secondary)]">
              QUESTION {current + 1} OF {questions.length} ·{" "}
              {assessment.difficulty}
            </p>
            {isAnswered && (
              <span
                className={`px-2.5 py-0.5 text-[10px] font-mono rounded-md font-semibold ${
                  isCorrect
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}
              >
                {isCorrect ? "✓ CORRECT" : "✗ INCORRECT"}
              </span>
            )}
          </div>

          <p className="font-display text-xl font-light mb-6 leading-relaxed text-[var(--text-primary)]">
            {q.question}
          </p>

          <div className="space-y-3">
            {(q.options || []).map((opt, i) => {
              const labels = ["A", "B", "C", "D", "E"];
              const isSelected = selected === opt;
              const isOptionTheCorrectOne = isOptionMatch(opt, q.correctAnswer, q.options);

              let optionStyle = `${border} bg-[var(--surface)] hover:bg-[var(--surface-elevated)]`;

              if (isAnswered) {
                if (isOptionTheCorrectOne) {
                  optionStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500";
                } else if (isSelected && !isCorrect) {
                  optionStyle = "border-red-500 bg-red-500/10 text-red-300 ring-1 ring-red-500";
                }
              } else if (isSelected) {
                optionStyle = "border-[var(--accent)] bg-[var(--surface-elevated)] ring-1 ring-[var(--accent)]";
              }

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
                  className={`w-full flex items-start gap-4 px-5 py-4 border rounded-xl text-left transition-all cursor-pointer ${optionStyle}`}
                >
                  <span className="font-mono text-xs flex-shrink-0 mt-0.5 opacity-60">
                    {labels[i] || "·"}
                  </span>
                  <span className="text-sm font-body leading-relaxed text-[var(--text-primary)]">
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Immediate Feedback Box */}
          {isAnswered && (
            <div
              className={`mt-5 p-4 rounded-xl border text-xs leading-relaxed animate-fade-in-up ${
                isCorrect
                  ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-300"
                  : "bg-red-500/5 border-red-500/30 text-red-300"
              }`}
            >
              {!isCorrect && (
                <p className="font-semibold text-emerald-400 mb-1">
                  Correct Answer: <span className="font-medium">{q.correctAnswer}</span>
                </p>
              )}
              {q.explanation && (
                <p className="text-[var(--text-secondary)] italic">
                  💡 {q.explanation}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className="px-6 py-4 border-t flex justify-between items-center"
        style={{
          borderColor: light ? "rgba(65,45,21,0.1)" : "rgba(225,220,201,0.08)",
        }}
      >
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="btn btn-ghost btn-sm disabled:opacity-20 cursor-pointer"
        >
          ← PREVIOUS
        </button>
        {current < questions.length - 1 ? (
          <button
            onClick={() => setCurrent((c) => c + 1)}
            className="btn btn-primary btn-sm cursor-pointer"
          >
            NEXT →
          </button>
        ) : (
          <button
            id="submit-quiz-btn"
            onClick={handleFinish}
            disabled={submitting}
            className="btn btn-primary btn-sm cursor-pointer"
          >
            {submitting ? "Grading..." : "SUBMIT QUIZ →"}
          </button>
        )}
      </div>
    </div>
  );
}

function QuizResult({
  attempt,
  assessment,
  sourceTitle,
  theme,
  onDownloadResultPDF,
  onReset,
}) {
  const [showReview, setShowReview] = useState(false);
  const light = theme === "light";
  const border = light
    ? "border-[rgba(65,45,21,0.1)]"
    : "border-[rgba(225,220,201,0.08)]";

  const answers = attempt.answers || [];
  const questions = assessment?.questions || [];
  const totalCount = attempt.totalMarks || questions.length || answers.length || 1;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const answeredCount = answers.filter((a) => a.userAnswer && String(a.userAnswer).trim() !== "").length;
  const unansweredCount = Math.max(0, totalCount - answeredCount);
  const incorrectCount = Math.max(0, totalCount - correctCount - unansweredCount);

  return (
    <div
      className="min-h-screen pt-14 page-shell"
      style={{ background: light ? "#F8F7F3" : "#000" }}
    >
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10 animate-fade-in-up">
          <p className="section-label mb-2">QUIZ COMPLETED</p>
          <div className="font-display text-8xl font-light mb-2 text-[var(--text-primary)]">
            {attempt.percentage}%
          </div>
          <p className="text-base font-medium text-[var(--text-primary)]">
            Score: {correctCount} / {totalCount}
          </p>
          {assessment.generationTimeSeconds && (
            <p className="text-xs font-mono text-[var(--text-secondary)] mt-1">
              ⏱ Generated in {assessment.generationTimeSeconds}s
            </p>
          )}
          <div className="flex justify-center gap-4 mt-4 text-xs font-mono flex-wrap">
            <span className="text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              ✓ Correct: {correctCount}
            </span>
            <span className="text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
              ✗ Incorrect: {incorrectCount}
            </span>
            {unansweredCount > 0 && (
              <span className="text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                — Unanswered: {unansweredCount}
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-3 mb-8">
          <button
            id="review-answers-btn"
            onClick={() => setShowReview(!showReview)}
            className="btn btn-secondary cursor-pointer"
          >
            {showReview ? "Hide Answers ↑" : "Review Answers ↓"}
          </button>
          <button
            id="download-result-pdf-btn"
            onClick={onDownloadResultPDF}
            className="btn btn-primary cursor-pointer flex items-center gap-2"
          >
            📥 Download Result PDF
          </button>
        </div>

        {showReview && (
          <div className="space-y-4 mb-8 animate-fade-in-up">
            <h3 className="section-label">Detailed Question Review</h3>
            {questions.map((q, idx) => {
              const ans = answers.find(
                (a) =>
                  String(a.questionId) === String(q.id) ||
                  (q._id && String(a.questionId) === String(q._id)) ||
                  String(a.questionIndex) === String(idx) ||
                  String(a.questionId) === String(idx),
              );
              const isCorrect = Boolean(ans?.isCorrect);
              const rawUserAns = ans?.userAnswer ? String(ans.userAnswer).trim() : "";
              const hasAnswered = Boolean(rawUserAns);

              return (
                <div
                  key={idx}
                  className={`panel p-5 border rounded-xl ${border} ${
                    isCorrect
                      ? "border-emerald-500/30"
                      : hasAnswered
                      ? "border-red-500/30"
                      : "border-amber-500/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {idx + 1}. {q.question}
                    </p>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono rounded-md ${
                        isCorrect
                          ? "bg-emerald-500/20 text-emerald-400"
                          : hasAnswered
                          ? "bg-red-500/20 text-red-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {isCorrect ? "CORRECT" : hasAnswered ? "INCORRECT" : "NOT ANSWERED"}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] mb-1">
                    Your Answer:{" "}
                    <span className={`font-medium ${isCorrect ? "text-emerald-400" : hasAnswered ? "text-red-400" : "text-[var(--text-secondary)]"}`}>
                      {rawUserAns || "Not Answered"}
                    </span>
                  </p>
                  {!isCorrect && (
                    <p className="text-xs text-emerald-400 mb-1">
                      Correct Answer:{" "}
                      <span className="font-medium">{q.correctAnswer}</span>
                    </p>
                  )}
                  {q.explanation && (
                    <p className="text-xs text-[var(--text-secondary)] mt-2 pt-2 border-t border-[var(--border)] italic">
                      💡 Explanation: {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button onClick={onReset} className="btn btn-primary cursor-pointer">
            Create Another Quiz →
          </button>
          <Link to="/history" className="btn btn-secondary">
            View in History
          </Link>
          <Link to="/progress" className="btn btn-ghost">
            Check Progress Analytics
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Quiz({ theme }) {
  const [searchParams] = useSearchParams();
  const initialKs = searchParams.get("knowledge");

  const [sources, setSources] = useState([]);
  const [phase, setPhase] = useState("setup"); // setup | ready | quiz | result
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
    questionCount,
    difficulty,
    questionType,
    regenerate = true,
  }) => {
    setSelectedKsId(knowledgeSourceId);
    setLoading(true);
    setError("");
    const startTime = Date.now();
    try {
      const generationId = crypto.randomUUID();
      const res = await ragApi.generateQuiz({
        knowledgeSourceIds: [knowledgeSourceId],
        knowledgeSourceId,
        generationId,
        questionCount,
        difficulty,
        questionType,
        regenerate,
      });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      setAssessment({
        ...res?.data,
        generationTimeSeconds: duration,
      });
      setPhase("ready");
    } catch (err) {
      setError(
        err?.payload?.message || err?.message || "Failed to generate quiz",
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedSource = sources.find((s) => s.id === selectedKsId);
  const sourceTitle = selectedSource?.title || "Knowledge Source";

  const handleDownloadQuestionPaperPDF = () => {
    if (!assessment) return;
    generateQuizQuestionPDF(assessment, sourceTitle);
  };

  const handleDownloadResultPDF = () => {
    if (!assessment || !attempt) return;
    generateQuizResultPDF(assessment, attempt, sourceTitle);
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
      setError(err.message || "Failed to grade assessment");
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === "setup") {
    return (
      <QuizSetup
        theme={theme}
        sources={sources}
        onGenerate={handleGenerate}
        loading={loading}
        error={error}
      />
    );
  }

  if (phase === "ready" && assessment) {
    return (
      <QuizReady
        assessment={assessment}
        sourceTitle={sourceTitle}
        theme={theme}
        onStartQuiz={() => setPhase("quiz")}
        onDownloadPDF={handleDownloadQuestionPaperPDF}
        onReset={() => {
          setAssessment(null);
          setPhase("setup");
        }}
      />
    );
  }

  if (phase === "quiz" && assessment) {
    return (
      <QuizExperience
        assessment={assessment}
        theme={theme}
        onSubmit={handleSubmitAttempt}
        submitting={submitting}
      />
    );
  }

  if (phase === "result" && attempt) {
    return (
      <QuizResult
        attempt={attempt}
        assessment={assessment}
        sourceTitle={sourceTitle}
        theme={theme}
        onDownloadResultPDF={handleDownloadResultPDF}
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
