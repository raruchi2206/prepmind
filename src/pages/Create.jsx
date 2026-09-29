import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { KnowledgeSignal } from "../components/KnowledgeSignal";

const modes = [
  {
    id: "summary",
    label: "SUMMARY",
    sub: "Turn your knowledge into a concise revision summary.",
    icon: "∑",
  },
  {
    id: "notes",
    label: "NOTES",
    sub: "Create crisp study notes with the key ideas.",
    icon: "≡",
  },
  {
    id: "quiz",
    label: "QUIZ",
    sub: "Test understanding with targeted recall questions.",
    icon: "?",
  },
  {
    id: "paper",
    label: "PRACTICE PAPER",
    sub: "Build a more complete practice exercise.",
    icon: "◻",
  },
  {
    id: "viva",
    label: "VIVA",
    sub: "Practice oral responses and concept checks.",
    icon: "◈",
  },
  {
    id: "ask",
    label: "ASK PREPMIND",
    sub: "Ask anything grounded in your selected sources.",
    icon: "⌁",
  },
];

const knowledgeSources = [
  { id: 1, title: "DBMS Notes", type: "PDF", meta: "42 pages" },
  { id: 2, title: "AI/ML Lecture", type: "YouTube", meta: "38:42" },
  { id: 3, title: "Operating Systems", type: "PPTX", meta: "56 slides" },
  { id: 4, title: "DBMS Normalization", type: "YouTube", meta: "24:11" },
];

export default function Create({ theme }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get("mode") || "summary");
  const [selectedSources, setSelectedSources] = useState([1]);
  const [instruction, setInstruction] = useState("");

  const light = theme === "light";

  const toggleSource = (id) => {
    setSelectedSources((prev) =>
      prev.includes(id)
        ? prev.filter((sourceId) => sourceId !== id)
        : [...prev, id],
    );
  };

  const handleCreate = () => {
    const routes = {
      summary: "/summary",
      notes: "/notes",
      quiz: "/quiz",
      paper: "/practice-paper",
      viva: "/viva",
      ask: "/ask",
    };
    navigate(routes[mode] || "/dashboard");
  };

  return (
    <div
      className="page-shell"
      style={{ background: light ? "#F8F7F3" : "#000000" }}
    >
      <div className="page-inner max-w-4xl">
        <div className="mb-8 animate-fade-in-up">
          <p className="section-label">Create</p>
          <h1 className="page-title mt-4">What do you want to create?</h1>
          <div className="mt-4 flex items-center gap-3">
            <KnowledgeSignal size={20} animated light={light} />
            <p className="text-sm text-[var(--text-secondary)]">
              Powered by your knowledge base
            </p>
          </div>
        </div>

        <div className="panel mb-8 overflow-hidden animate-fade-in-up delay-100">
          <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {modes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMode(item.id);
                  if (item.id === "ask") navigate("/ask");
                }}
                className="rounded-2xl border p-5 text-left transition-all"
                style={{
                  background:
                    mode === item.id
                      ? "var(--accent)"
                      : "var(--surface-elevated)",
                  color:
                    mode === item.id
                      ? "var(--accent-foreground)"
                      : "var(--text-primary)",
                  borderColor:
                    mode === item.id ? "transparent" : "var(--border)",
                }}
              >
                <span className="mb-4 block font-mono text-2xl opacity-80">
                  {item.icon}
                </span>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em]">
                  {item.label}
                </p>
                <p
                  className="mt-2 text-sm leading-6"
                  style={{
                    color:
                      mode === item.id
                        ? "var(--accent-foreground)"
                        : "var(--text-secondary)",
                  }}
                >
                  {item.sub}
                </p>
              </button>
            ))}
          </div>
        </div>

        {mode && mode !== "ask" && (
          <div className="mb-6 animate-fade-in-up">
            <p className="section-label">Choose knowledge</p>
            <div className="mt-4 space-y-3">
              {knowledgeSources.map((source) => (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => toggleSource(source.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all"
                  style={{
                    background: selectedSources.includes(source.id)
                      ? "var(--surface-elevated)"
                      : "var(--surface)",
                    borderColor: selectedSources.includes(source.id)
                      ? "var(--ring)"
                      : "var(--border)",
                  }}
                >
                  <div
                    className="flex h-5 w-5 items-center justify-center rounded-md border"
                    style={{
                      borderColor: selectedSources.includes(source.id)
                        ? "var(--accent)"
                        : "var(--border)",
                      background: selectedSources.includes(source.id)
                        ? "var(--accent)"
                        : "transparent",
                    }}
                  >
                    {selectedSources.includes(source.id) && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1.5 4.2L3.8 6.5L8.5 1.8"
                          stroke={light ? "#1F150C" : "#17130F"}
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-base text-[var(--text-primary)]">
                      {source.title}
                    </p>
                    <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                      {source.type} · {source.meta}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode && mode !== "ask" && (
          <div className="mb-8 animate-fade-in-up">
            <p className="section-label">Custom instruction</p>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
              placeholder="Focus mainly on normalization."
              className="mt-4 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "Focus mainly on normalization.",
                "Create difficult questions.",
                "Explain this for exam preparation.",
              ].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setInstruction(example)}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 font-mono text-[0.56rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode && mode !== "ask" && (
          <button
            type="button"
            onClick={handleCreate}
            disabled={selectedSources.length === 0}
            className="btn btn-primary w-full disabled:opacity-50"
          >
            Generate {modes.find((item) => item.id === mode)?.label}
          </button>
        )}
      </div>
    </div>
  );
}
