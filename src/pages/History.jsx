import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { historyApi } from "../services/api";
import {
  generateSummaryPDF,
  generateNotesPDF,
  generateQuizQuestionPDF,
  generatePracticePaperPDF,
} from "../utils/pdfGenerator";

const filters = ["ALL", "SUMMARY", "NOTES", "QUIZ", "PRACTICE_PAPER", "ASK", "ATTEMPT"];

const typeColors = {
  QUIZ: "#6BA37A",
  NOTES: "#5B8AC4",
  PRACTICE_PAPER: "#C49A5B",
  SUMMARY: "#8B7CC4",
  ASK: "#7CC4B4",
  ATTEMPT: "#E67E22",
};

function SessionDetail({ item, theme, onClose, onDelete }) {
  const light = theme === "light";
  const border = light
    ? "border-[rgba(65,45,21,0.1)]"
    : "border-[rgba(225,220,201,0.08)]";
  const muted = light
    ? "text-[rgba(0,0,0,0.6)]"
    : "text-[rgba(225,220,201,0.6)]";
  const sub = light
    ? "text-[rgba(0,0,0,0.4)]"
    : "text-[rgba(225,220,201,0.4)]";

  const [detailed, setDetailed] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadItem() {
      try {
        const res = await historyApi.getById(item.id);
        setDetailed(res?.data || item);
      } catch (err) {
        setDetailed(item);
      } finally {
        setLoading(false);
      }
    }
    if (item.id) {
      loadItem();
    }
  }, [item.id]);

  const target = detailed || item;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-2xl overflow-y-auto p-6 panel"
        style={{ background: light ? "#F8F7F3" : "#0A0703" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="pb-5 border-b flex items-center justify-between"
          style={{
            borderColor: light
              ? "rgba(65,45,21,0.1)"
              : "rgba(225,220,201,0.08)",
          }}
        >
          <div>
            <p className={`font-mono text-[10px] tracking-widest mb-1 ${sub}`}>
              {target.type} DETAILS
            </p>
            <h3 className="font-display text-xl text-[var(--text-primary)]">
              {target.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm font-mono text-xs"
          >
            ✕ Close
          </button>
        </div>

        <div className="py-6 space-y-6">
          {target.score != null && (
            <div
              className={`p-6 border rounded-xl text-center ${border}`}
              style={{ background: light ? "#fff" : "#1F150C" }}
            >
              <p className={`font-mono text-[9px] tracking-widest mb-2 ${sub}`}>
                SCORE
              </p>
              <p className="font-display text-5xl font-light text-[var(--text-primary)]">
                {target.percentage != null ? `${target.percentage}%` : `${target.score} pts`}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {target.score} / {target.totalMarks} marks
              </p>
            </div>
          )}

          {target.sources && target.sources.length > 0 && (
            <div>
              <p className={`font-mono text-[10px] tracking-widest mb-2 ${sub}`}>
                SOURCE CITATIONS
              </p>
              <div className="flex flex-wrap gap-2">
                {target.sources.map((s, idx) => (
                  <span
                    key={idx}
                    className={`text-xs px-2.5 py-1 rounded-lg border ${border} bg-[var(--surface-elevated)] text-[var(--text-secondary)]`}
                  >
                    📄 {s.label || s.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          {target.content && typeof target.content === "string" && (
            <div>
              <p className={`font-mono text-[10px] tracking-widest mb-2 ${sub}`}>
                GENERATED CONTENT
              </p>
              <div
                className={`p-5 border rounded-xl whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-primary)] ${border}`}
                style={{ background: light ? "#fff" : "#1F150C" }}
              >
                {target.content}
              </div>
            </div>
          )}

          {target.messages && Array.isArray(target.messages) && (
            <div className="space-y-3">
              <p className={`font-mono text-[10px] tracking-widest mb-2 ${sub}`}>
                CONVERSATION HISTORY ({target.messages.length} messages)
              </p>
              {target.messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border text-xs leading-relaxed ${border} ${
                    m.role === "user"
                      ? "bg-[var(--surface-elevated)] text-[var(--text-primary)] ml-8"
                      : "bg-[var(--surface)] text-[var(--text-primary)] mr-8"
                  }`}
                >
                  <p className="font-mono text-[9px] uppercase tracking-widest mb-1 text-[var(--text-secondary)]">
                    {m.role}
                  </p>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-4 items-center">
            {target.type === "SUMMARY" && (
              <button
                onClick={() => generateSummaryPDF(target, target.title)}
                className="btn btn-primary btn-sm flex items-center gap-1.5 font-mono text-xs cursor-pointer"
              >
                📥 Download Summary PDF
              </button>
            )}
            {target.type === "NOTES" && (
              <button
                onClick={() => generateNotesPDF(target, target.title)}
                className="btn btn-primary btn-sm flex items-center gap-1.5 font-mono text-xs cursor-pointer"
              >
                📥 Download Notes PDF
              </button>
            )}
            {target.type === "QUIZ" && target.assessment && (
              <button
                onClick={() => generateQuizQuestionPDF(target.assessment, target.title)}
                className="btn btn-primary btn-sm flex items-center gap-1.5 font-mono text-xs cursor-pointer"
              >
                📥 Download Question Paper PDF
              </button>
            )}
            {target.type === "PRACTICE_PAPER" && target.assessment && (
              <button
                onClick={() => generatePracticePaperPDF(target.assessment, target.title)}
                className="btn btn-primary btn-sm flex items-center gap-1.5 font-mono text-xs cursor-pointer"
              >
                📥 Download Practice Paper PDF
              </button>
            )}
            <button
              onClick={() => onDelete(target.id)}
              className="btn btn-ghost btn-sm text-red-400 hover:text-red-300 cursor-pointer"
            >
              Delete Session
            </button>
            <button onClick={onClose} className="btn btn-secondary btn-sm ml-auto cursor-pointer">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function History({ theme }) {
  const [filter, setFilter] = useState("ALL");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  const light = theme === "light";
  const border = light
    ? "border-[rgba(65,45,21,0.1)]"
    : "border-[rgba(225,220,201,0.08)]";
  const sub = light
    ? "text-[rgba(0,0,0,0.4)]"
    : "text-[rgba(225,220,201,0.4)]";

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await historyApi.getAll();
      setItems(res?.data?.items || []);
    } catch (err) {
      setError(err.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id) => {
    try {
      await historyApi.delete(id);
      setSelected(null);
      await loadHistory();
    } catch (err) {
      setError(err.message || "Failed to delete item");
    }
  };

  const filtered =
    filter === "ALL" ? items : items.filter((h) => h.type === filter);

  return (
    <div
      className="page-shell"
      style={{ background: light ? "#F8F7F3" : "#000" }}
    >
      {selected && (
        <SessionDetail
          item={selected}
          theme={theme}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
        />
      )}

      <div className="page-inner max-w-4xl">
        <div className="mb-8 animate-fade-in-up">
          <p className="section-label mb-1">STUDY LOG</p>
          <h1 className="font-display text-4xl font-light text-[var(--text-primary)]">
            Your Generated History
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Access past summaries, study notes, quizzes, and practice papers saved in your account.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-8 flex-wrap animate-fade-in-up">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all ${
                filter === f
                  ? "btn-primary"
                  : `border ${border} bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]`
              }`}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="panel p-12 text-center text-sm text-[var(--text-secondary)]">
            Loading study history...
          </div>
        ) : filtered.length === 0 ? (
          <div className="panel p-12 text-center">
            <h3 className="font-display text-2xl text-[var(--text-primary)]">
              No study history found
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md mx-auto">
              Generate notes, summaries, or quizzes from your uploaded documents to build your personal study log.
            </p>
            <Link to="/create" className="btn btn-primary mt-6 inline-block">
              Create Content →
            </Link>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in-up">
            {filtered.map((h) => (
              <button
                key={h.id}
                onClick={() => setSelected(h)}
                className={`w-full flex items-center gap-4 px-5 py-4 border rounded-xl text-left transition-all group panel hover:border-[var(--ring)]`}
              >
                <div
                  className="w-2.5 h-10 rounded-full flex-shrink-0"
                  style={{
                    background: typeColors[h.type] || "#999",
                    opacity: 0.8,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {h.title}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                    {h.type.replace("_", " ")} ·{" "}
                    {new Date(h.createdAt || h.updatedAt).toLocaleDateString()}{" "}
                    {new Date(h.createdAt || h.updatedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {h.score != null && (
                  <div className="text-right flex-shrink-0">
                    <p className="font-display text-lg font-light text-[var(--text-primary)]">
                      {h.percentage != null ? `${h.percentage}%` : `${h.score} pts`}
                    </p>
                  </div>
                )}
                <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                  →
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
