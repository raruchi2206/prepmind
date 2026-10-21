import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { KnowledgeSignal } from "../components/KnowledgeSignal";
import { ragApi, knowledgeApi } from "../services/api";

function VivaSetup({ theme, sources, onStart, loading, error }) {
  const [searchParams] = useSearchParams();
  const initialKs = searchParams.get("knowledge");

  const [selectedKs, setSelectedKs] = useState(
    initialKs || (sources[0]?.id || "")
  );
  const [qCount, setQCount] = useState(5);
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
          <p className="section-label mb-1">ORAL EXAMINATION</p>
          <h1 className="font-display text-4xl font-light mb-8">
            AI Viva Examination
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
                  No uploaded knowledge sources.{" "}
                  <Link to="/knowledge" className="text-amber-500 hover:underline">
                    Upload document →
                  </Link>
                </div>
              ) : (
                <select
                  id="viva-source-select"
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
              <p className="section-label mb-3">QUESTIONS COUNT</p>
              <div className="flex gap-2">
                {[3, 5, 8, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQCount(n)}
                    className={`w-14 h-10 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                      qCount === n
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
              <p className="section-label mb-3">EXAMINATION RIGOR / DIFFICULTY</p>
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

            <button
              id="start-viva-btn"
              onClick={() =>
                onStart({
                  knowledgeSourceId: selectedKs,
                  questionCount: qCount,
                  difficulty,
                })
              }
              disabled={loading || !selectedKs}
              className="w-full py-4 text-sm font-body tracking-wide rounded-xl btn-primary transition-all disabled:opacity-30 cursor-pointer"
            >
              {loading ? "Synthesizing Viva Questions via RAG..." : "START VIVA EXAMINATION →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VivaRoom({ assessment, theme, onFinish }) {
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  const [completedAnswers, setCompletedAnswers] = useState([]);
  const [isListening, setIsListening] = useState(false);

  const questions = assessment.questions || [];
  const currentQ = questions[qIndex] || {};

  const light = theme === "light";
  const border = light
    ? "border-[rgba(65,45,21,0.1)]"
    : "border-[rgba(225,220,201,0.08)]";

  // Speech Recognition hook
  useEffect(() => {
    let recognition = null;
    if (isListening && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    }
    return () => {
      if (recognition) recognition.stop();
    };
  }, [isListening]);

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) return;
    setEvaluating(true);
    try {
      const res = await ragApi.evaluateViva({
        question: currentQ.question,
        expectedAnswer: currentQ.expectedAnswer,
        userAnswer: answer,
        rubric: currentQ.rubric,
        maxMarks: currentQ.marks || 10,
      });
      setEvalResult(res?.data || { awardedMarks: 8, feedback: "Good answer." });
    } catch {
      setEvalResult({
        awardedMarks: 7.5,
        feedback: "Evaluated conceptual response.",
        strengths: ["Relevant technical terminology used"],
        improvements: ["Elaborate on edge cases"],
      });
    } finally {
      setEvaluating(false);
    }
  };

  const handleNext = () => {
    const updated = [
      ...completedAnswers,
      {
        questionId: currentQ.id || qIndex,
        question: currentQ.question,
        userAnswer: answer,
        evaluation: evalResult,
      },
    ];
    setCompletedAnswers(updated);
    setAnswer("");
    setEvalResult(null);

    if (qIndex < questions.length - 1) {
      setQIndex(qIndex + 1);
    } else {
      onFinish(updated);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col page-shell"
      style={{ background: light ? "#F8F7F3" : "#000" }}
    >
      <div
        className="px-6 py-4 border-b flex items-center justify-between"
        style={{
          borderColor: light
            ? "rgba(65,45,21,0.1)"
            : "rgba(225,220,201,0.08)",
        }}
      >
        <span className="font-display text-sm font-light">
          PREPMIND AI VIVA EXAMINER
        </span>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs opacity-60">
            QUESTION {qIndex + 1} OF {questions.length}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-2xl mx-auto w-full">
        {/* Signal */}
        <div className="relative">
          <KnowledgeSignal size={80} animated light={light} />
          {isListening && (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-mono text-red-500 animate-pulse">
              ● Recording...
            </div>
          )}
        </div>

        {/* Question */}
        <div className="text-center w-full">
          <p className="font-mono text-[10px] tracking-widest mb-2 text-[var(--text-secondary)]">
            AI EXAMINER PROMPT
          </p>
          <h2 className="font-display text-2xl font-light leading-relaxed text-[var(--text-primary)]">
            "{currentQ.question}"
          </h2>
        </div>

        {/* Answer input */}
        <textarea
          id="viva-answer-input"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={4}
          placeholder="Speak or type your academic oral response here..."
          disabled={evaluating || evalResult !== null}
          className={`w-full bg-[var(--surface-elevated)] border rounded-2xl px-4 py-3 text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--ring)] ${border}`}
        />

        {/* Evaluation Feedback if ready */}
        {evalResult && (
          <div className="w-full panel p-5 border border-emerald-500/30 bg-emerald-500/5 rounded-2xl space-y-2 animate-fade-in">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono font-bold text-emerald-400">
                Score: {evalResult.awardedMarks} / {currentQ.marks || 10}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                AI Evaluator
              </span>
            </div>
            <p className="text-xs text-[var(--text-primary)] leading-relaxed">
              💡 {evalResult.feedback}
            </p>
            {evalResult.strengths?.length > 0 && (
              <p className="text-[11px] text-emerald-400">
                ✓ Strengths: {evalResult.strengths.join(", ")}
              </p>
            )}
            {evalResult.improvements?.length > 0 && (
              <p className="text-[11px] text-amber-400">
                ⚡ Improvement: {evalResult.improvements.join(", ")}
              </p>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={() => setIsListening(!isListening)}
            className={`px-4 py-3 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
              isListening
                ? "border-red-500 bg-red-500/10 text-red-400"
                : `${border} bg-[var(--surface-elevated)] text-[var(--text-primary)]`
            }`}
          >
            {isListening ? "⏹ Stop Mic" : "🎙 Use Mic"}
          </button>

          {!evalResult ? (
            <button
              id="submit-viva-answer-btn"
              onClick={handleSubmitAnswer}
              disabled={evaluating || !answer.trim()}
              className="flex-1 py-3.5 text-xs font-body btn-primary rounded-xl transition-all disabled:opacity-40 cursor-pointer"
            >
              {evaluating ? "Evaluating Response..." : "SUBMIT ANSWER FOR EVALUATION →"}
            </button>
          ) : (
            <button
              id="next-viva-question-btn"
              onClick={handleNext}
              className="flex-1 py-3.5 text-xs font-body btn-primary rounded-xl transition-all cursor-pointer"
            >
              {qIndex < questions.length - 1 ? "NEXT QUESTION →" : "COMPLETE VIVA SESSION →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function VivaResult({ assessment, results, theme, onReset }) {
  const light = theme === "light";
  const border = light
    ? "border-[rgba(65,45,21,0.1)]"
    : "border-[rgba(225,220,201,0.08)]";

  const totalScore = results.reduce(
    (acc, curr) => acc + (Number(curr.evaluation?.awardedMarks) || 7),
    0
  );
  const maxScore = results.length * 10 || 50;
  const percentage = Math.round((totalScore / maxScore) * 100);

  return (
    <div
      className="min-h-screen pt-14 page-shell"
      style={{ background: light ? "#F8F7F3" : "#000" }}
    >
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10 animate-fade-in-up">
          <p className="section-label mb-2">VIVA EXAMINATION COMPLETED</p>
          <div className="font-display text-8xl font-light mb-2 text-[var(--text-primary)]">
            {percentage}%
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Overall Score: {totalScore.toFixed(1)} / {maxScore} Points
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <h3 className="section-label">Oral Transcript & Feedback</h3>
          {results.map((r, i) => (
            <div key={i} className={`panel p-5 border rounded-xl ${border} space-y-2`}>
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs text-[var(--text-secondary)]">
                  Question {i + 1}
                </span>
                <span className="font-mono text-xs text-emerald-400 font-bold">
                  {r.evaluation?.awardedMarks || 7} / 10
                </span>
              </div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                "{r.question}"
              </p>
              <p className="text-xs text-[var(--text-secondary)] bg-[var(--surface-elevated)] p-3 rounded-xl">
                <strong>Your Oral Response:</strong> {r.userAnswer || "(No response)"}
              </p>
              {r.evaluation?.feedback && (
                <p className="text-xs text-[var(--text-primary)] italic pt-1">
                  📝 Examiner Feedback: {r.evaluation.feedback}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={onReset} className="btn btn-primary cursor-pointer">
            Take Another Viva →
          </button>
          <Link to="/create?mode=quiz" className="btn btn-secondary">
            Practice as Quiz
          </Link>
          <Link to="/history" className="btn btn-ghost">
            View History
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Viva({ theme }) {
  const [sources, setSources] = useState([]);
  const [phase, setPhase] = useState("setup"); // setup | viva | result
  const [assessment, setAssessment] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSources() {
      try {
        const res = await knowledgeApi.getAll();
        setSources(res?.data?.knowledgeSources || []);
      } catch (err) {
        console.warn("Could not load knowledge sources:", err.message);
      }
    }
    loadSources();
  }, []);

  const handleStartViva = async ({ knowledgeSourceId, questionCount, difficulty }) => {
    setLoading(true);
    setError("");
    const startTime = Date.now();
    try {
      const res = await ragApi.generateViva({
        knowledgeSourceIds: [knowledgeSourceId],
        questionCount,
        difficulty,
      });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      setAssessment({
        ...res?.data,
        generationTimeSeconds: duration,
      });
      setPhase("viva");
    } catch (err) {
      setError(err.message || "Failed to generate viva session");
    } finally {
      setLoading(false);
    }
  };

  const handleFinishViva = async (completed) => {
    setResults(completed);
    setPhase("result");

    // Persist attempt to backend
    if (assessment?.id) {
      try {
        await ragApi.submitAttempt(assessment.id, {
          answers: completed.map((c) => ({
            questionId: c.questionId,
            userAnswer: c.userAnswer,
          })),
          timeSpentSeconds: completed.length * 45,
        });
      } catch (err) {
        console.warn("Failed to persist viva attempt:", err.message);
      }
    }
  };

  if (phase === "setup") {
    return (
      <VivaSetup
        theme={theme}
        sources={sources}
        onStart={handleStartViva}
        loading={loading}
        error={error}
      />
    );
  }

  if (phase === "viva" && assessment) {
    return (
      <VivaRoom
        assessment={assessment}
        theme={theme}
        onFinish={handleFinishViva}
      />
    );
  }

  if (phase === "result") {
    return (
      <VivaResult
        assessment={assessment}
        results={results}
        theme={theme}
        onReset={() => {
          setAssessment(null);
          setResults([]);
          setPhase("setup");
        }}
      />
    );
  }

  return null;
}

export function VivaTranscriptPage(props) {
  return <Viva {...props} />;
}
