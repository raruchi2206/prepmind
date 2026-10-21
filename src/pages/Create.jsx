import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { KnowledgeSignal } from "../components/KnowledgeSignal";
import { knowledgeApi } from "../services/api";

const modes = [
  {
    id: "summary",
    label: "SUMMARY",
    sub: "Turn your knowledge into a concise revision summary.",
    icon: "∑",
    route: "/summary",
  },
  {
    id: "notes",
    label: "NOTES",
    sub: "Create crisp study notes with the key ideas.",
    icon: "≡",
    route: "/notes",
  },
  {
    id: "quiz",
    label: "QUIZ",
    sub: "Test understanding with targeted recall questions.",
    icon: "?",
    route: "/quiz",
  },
  {
    id: "paper",
    label: "PRACTICE PAPER",
    sub: "Build a more complete practice exercise.",
    icon: "◻",
    route: "/practice-paper",
  },
  {
    id: "viva",
    label: "VIVA",
    sub: "Practice oral responses and concept checks.",
    icon: "◈",
    route: "/viva",
  },
  {
    id: "ask",
    label: "ASK PREPMIND",
    sub: "Ask anything grounded in your selected sources.",
    icon: "⌁",
    route: "/ask",
  },
];

export default function Create({ theme }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [knowledgeList, setKnowledgeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [error, setError] = useState("");
  const [activeGeneratingId, setActiveGeneratingId] = useState(null);

  const light = theme === "light";

  useEffect(() => {
    async function loadSources() {
      try {
        const res = await knowledgeApi.getAll();
        const sources = res?.data?.knowledgeSources || [];
        setKnowledgeList(sources);

        const initialKnowledgeParam = params.get("knowledge");
        if (initialKnowledgeParam) {
          const match = sources.find((s) => s.id === initialKnowledgeParam);
          if (match) {
            setSelectedSourceId(match.id);
          } else if (sources.length > 0) {
            setSelectedSourceId(sources[0].id);
          }
        } else if (sources.length > 0) {
          setSelectedSourceId(sources[0].id);
        }
      } catch (err) {
        console.error("Create page failed to load knowledge sources:", err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSources();
  }, [params]);

  const handleCardClick = (item) => {
    setError("");

    if (!selectedSourceId) {
      setError("Select a knowledge source first.");
      return;
    }

    const selectedDoc = knowledgeList.find((s) => s.id === selectedSourceId);
    if (selectedDoc && selectedDoc.status !== "READY") {
      setError("This document is still being processed. Please try again when processing is complete.");
      return;
    }

    if (activeGeneratingId) return; // Prevent simultaneous duplicate generations

    setActiveGeneratingId(item.id);
    navigate(`${item.route}?knowledge=${selectedSourceId}`);
  };

  return (
    <div
      className="page-shell"
      style={{ background: light ? "#F8F7F3" : "#000000" }}
    >
      <div className="page-inner max-w-4xl">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <p className="section-label">Create</p>
          <h1 className="page-title mt-4">What do you want to create?</h1>
          <div className="mt-4 flex items-center gap-3">
            <KnowledgeSignal size={20} animated light={light} />
            <p className="text-sm text-[var(--text-secondary)]">
              Powered by your uploaded knowledge sources & RAG pipeline
            </p>
          </div>
        </div>

        {/* Knowledge Source Selection */}
        <div className="mb-6 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <p className="section-label">Selected Knowledge Source</p>
            <Link
              to="/knowledge"
              className="text-xs text-[var(--accent)] hover:underline"
            >
              + Manage Knowledge Sources
            </Link>
          </div>

          {loading ? (
            <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 text-center text-xs text-[var(--text-secondary)]">
              Loading knowledge sources...
            </div>
          ) : knowledgeList.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-elevated)] p-8 text-center">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                No knowledge sources available
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Upload a document first to generate AI assessments from it.
              </p>
              <Link to="/knowledge" className="btn btn-primary btn-sm mt-4 inline-flex">
                Upload Document →
              </Link>
            </div>
          ) : (
            <div className="mt-3">
              <select
                id="source-selector"
                value={selectedSourceId}
                onChange={(e) => {
                  setSelectedSourceId(e.target.value);
                  setError("");
                }}
                className="w-full text-sm font-medium px-4 py-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)] transition-all"
              >
                {knowledgeList.map((source) => {
                  const chunkCount = source.metadata?.chunkCount ?? 0;
                  return (
                    <option key={source.id} value={source.id}>
                      {source.title} ({source.type} · {chunkCount} chunks · {source.status})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-medium text-amber-400 flex items-center justify-between animate-fade-in">
            <span>⚠️ {error}</span>
            {knowledgeList.length === 0 && (
              <Link to="/knowledge" className="underline hover:text-amber-300 ml-3">
                Upload now
              </Link>
            )}
          </div>
        )}

        {/* Feature Cards */}
        <div className="panel mb-8 overflow-hidden animate-fade-in-up delay-100">
          <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {modes.map((item) => {
              const isGenerating = activeGeneratingId === item.id;
              const isDisabled = activeGeneratingId && !isGenerating;

              return (
                <button
                  key={item.id}
                  id={`create-card-${item.id}`}
                  type="button"
                  onClick={() => handleCardClick(item)}
                  disabled={isDisabled}
                  className={`rounded-2xl border p-5 text-left transition-all relative overflow-hidden group cursor-pointer ${
                    isDisabled ? "opacity-40 cursor-not-allowed" : "hover:border-[var(--ring)] hover:scale-[1.01]"
                  }`}
                  style={{
                    background: "var(--surface-elevated)",
                    color: "var(--text-primary)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="block font-mono text-2xl opacity-80 group-hover:text-[var(--accent)] transition-colors">
                      {item.icon}
                    </span>
                    {isGenerating && (
                      <span className="font-mono text-[0.6rem] uppercase tracking-wider text-[var(--accent)] animate-pulse">
                        Opening...
                      </span>
                    )}
                  </div>

                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] font-semibold text-[var(--text-primary)]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {item.sub}
                  </p>

                  <div className="mt-4 flex items-center text-xs font-medium text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity">
                    Open {item.label} →
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
