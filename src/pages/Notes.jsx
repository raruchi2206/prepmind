import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { KnowledgeSignal } from "../components/KnowledgeSignal";
import { ragApi, knowledgeApi } from "../services/api";
import { generateNotesPDF } from "../utils/pdfGenerator";

function formatAcademicText(rawText) {
  if (!rawText) return [];
  // Clean raw markdown artifacts and emojis
  let clean = rawText
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*{1,3}(.*?)\*{1,3}/g, "$1")
    .replace(/^[-=_]{3,}\s*$/gm, "")
    .replace(/`/g, "")
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/gu, "")
    .trim();

  // Split into paragraphs / sections
  const lines = clean.split("\n");
  const parsedBlocks = [];
  let currentBlock = { type: "paragraph", content: [] };

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentBlock.content.length > 0) {
        parsedBlocks.push({ ...currentBlock, text: currentBlock.content.join(" ") });
        currentBlock = { type: "paragraph", content: [] };
      }
      continue;
    }

    // Numbered section header (e.g. "1. Introduction", "2. Core Concepts", "2.1 Thresholding")
    if (/^\d+(\.\d+)*\s+[A-Za-z]/.test(trimmed)) {
      if (currentBlock.content.length > 0) {
        parsedBlocks.push({ ...currentBlock, text: currentBlock.content.join(" ") });
        currentBlock = { type: "paragraph", content: [] };
      }
      const isSub = /^\d+\.\d+/.test(trimmed);
      parsedBlocks.push({
        type: isSub ? "subheading" : "heading",
        text: trimmed,
      });
      continue;
    }

    // Bullet points (e.g. "- point", "• point")
    if (/^[-•*]\s+/.test(trimmed)) {
      if (currentBlock.content.length > 0 && currentBlock.type !== "list") {
        parsedBlocks.push({ ...currentBlock, text: currentBlock.content.join(" ") });
        currentBlock = { type: "list", items: [] };
      } else if (currentBlock.type !== "list") {
        currentBlock = { type: "list", items: [] };
      }
      currentBlock.items.push(trimmed.replace(/^[-•*]\s+/, ""));
      continue;
    }

    currentBlock.content.push(trimmed);
  }

  if (currentBlock.content?.length > 0) {
    parsedBlocks.push({ ...currentBlock, text: currentBlock.content.join(" ") });
  } else if (currentBlock.items?.length > 0) {
    parsedBlocks.push(currentBlock);
  }

  return parsedBlocks;
}

export default function Notes({ theme }) {
  const [searchParams] = useSearchParams();
  const initialKs = searchParams.get("knowledge");

  const [sources, setSources] = useState([]);
  const [selectedKs, setSelectedKs] = useState(initialKs || "");
  const [loading, setLoading] = useState(false);
  const [notesData, setNotesData] = useState(null);
  const [error, setError] = useState("");
  const light = theme === "light";

  useEffect(() => {
    async function loadSources() {
      try {
        const res = await knowledgeApi.getAll();
        const list = res?.data?.knowledgeSources || [];
        setSources(list);
        if (list.length > 0 && !selectedKs) {
          setSelectedKs(list[0].id);
        }
      } catch (err) {
        console.warn("Could not fetch knowledge sources:", err.message);
      }
    }
    loadSources();
  }, []);

  const handleGenerate = async (ksId = selectedKs, regenerate = false) => {
    if (!ksId) {
      setError("Select a knowledge source first.");
      return;
    }
    setLoading(true);
    setError("");
    const startTime = Date.now();
    try {
      const res = await ragApi.generateNotes({
        knowledgeSourceIds: [ksId],
        regenerate,
      });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      setNotesData({
        ...res?.data,
        generationTimeSeconds: duration,
      });
    } catch (err) {
      setError(err.message || "Unable to generate content right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedSource = sources.find((s) => s.id === selectedKs);
  const sourceTitle = selectedSource?.title || "Knowledge Source";

  const handleDownloadPDF = () => {
    if (!notesData) return;
    generateNotesPDF(notesData, sourceTitle);
  };

  const parsedBlocks = formatAcademicText(notesData?.content || "");

  if (loading) {
    return (
      <div
        className="page-shell"
        style={{ background: light ? "#F8F7F3" : "#000000" }}
      >
        <div className="page-inner flex min-h-[70vh] flex-col items-center justify-center gap-6">
          <KnowledgeSignal size={90} animated light={light} />
          <div className="text-center max-w-md">
            <h3 className="font-display text-2xl text-[var(--text-primary)] font-medium">
              Generating Academic Notes...
            </h3>
            <p className="mt-2 text-xs font-mono text-[var(--text-secondary)] uppercase tracking-widest">
              Retrieving grounded chunks and synthesizing lecture structure
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="page-shell"
      style={{ background: light ? "#F8F7F3" : "#000000" }}
    >
      <div className="page-inner max-w-4xl">
        {/* Header and Action Controls */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between animate-fade-in-up">
          <div>
            <p className="section-label">Study Notes</p>
            <h1 className="mt-4 font-display text-4xl text-[var(--text-primary)]">
              {notesData?.title ? notesData.title.replace(/^Notes:\s*/, "") : "Academic Study Notes"}
            </h1>
            <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Source-Grounded University Lecture Notes
            </p>
          </div>

          <div className="flex items-center gap-3">
            {sources.length === 0 ? (
              <Link to="/knowledge" className="btn btn-primary btn-sm">
                + Upload Document
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  id="notes-source-select"
                  value={selectedKs}
                  onChange={(e) => {
                    setSelectedKs(e.target.value);
                    setNotesData(null);
                  }}
                  className="text-xs px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)]"
                >
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.type})
                    </option>
                  ))}
                </select>
                <button
                  id="generate-notes-btn"
                  onClick={() => handleGenerate(selectedKs, Boolean(notesData))}
                  className="btn btn-primary btn-sm whitespace-nowrap cursor-pointer"
                >
                  {notesData ? "Regenerate ↻" : "Generate Notes →"}
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => handleGenerate(selectedKs, false)}
              className="underline font-medium ml-4 hover:text-red-300 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Idle State */}
        {!notesData && !loading && (
          <div className="panel p-12 text-center animate-fade-in-up">
            <KnowledgeSignal size={60} animated light={light} />
            <h3 className="font-display text-2xl text-[var(--text-primary)] mt-4">
              Select a Knowledge Source to Generate Notes
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-md mx-auto">
              PrepMind synthesizes structured, in-depth academic study notes with core principles, formal definitions, and quick revision points grounded in your document.
            </p>
            {sources.length > 0 && (
              <button
                id="idle-generate-notes-btn"
                onClick={() => handleGenerate(selectedKs, false)}
                className="btn btn-primary mt-6 inline-flex cursor-pointer"
              >
                Generate Study Notes →
              </button>
            )}
          </div>
        )}

        {/* Success / Notes Render */}
        {notesData && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center gap-3">
              {notesData.generationTimeSeconds && (
                <span className="text-xs font-mono text-[var(--accent)] bg-[var(--surface-elevated)] px-3 py-1 rounded-md border border-[var(--border)]">
                  ⏱ Generated in {notesData.generationTimeSeconds}s
                </span>
              )}
              {notesData.cached && (
                <span className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--surface-elevated)] px-3 py-1 rounded-md border border-[var(--border)]">
                  ⚡ Loaded from cache
                </span>
              )}
              <div className="flex justify-end gap-2 ml-auto">
                <button
                  id="download-notes-pdf-btn"
                  onClick={handleDownloadPDF}
                  className="btn btn-secondary btn-sm flex items-center gap-2 font-mono text-xs cursor-pointer"
                  title="Download vector-formatted academic PDF"
                >
                  📥 Download PDF
                </button>
              </div>
            </div>

            <article className="panel p-8 sm:p-12 space-y-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm">
              <div className="border-b border-[var(--border)] pb-6 mb-6">
                <h2 className="font-display text-3xl text-[var(--text-primary)] font-semibold leading-tight">
                  {notesData.title ? notesData.title.replace(/^Notes:\s*/, "") : "Academic Study Notes"}
                </h2>
                <p className="mt-2 text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                  Course & Subject Reference Notes
                </p>
              </div>

              <div className="space-y-4 text-sm text-[var(--text-primary)] leading-relaxed">
                {parsedBlocks.map((block, idx) => {
                  if (block.type === "heading") {
                    return (
                      <h3
                        key={idx}
                        className="font-display text-xl text-[var(--text-primary)] font-medium pt-4 pb-1 border-b border-[var(--border)]"
                      >
                        {block.text}
                      </h3>
                    );
                  }
                  if (block.type === "subheading") {
                    return (
                      <h4
                        key={idx}
                        className="font-display text-base text-[var(--text-primary)] font-medium pt-2 text-[var(--accent)]"
                      >
                        {block.text}
                      </h4>
                    );
                  }
                  if (block.type === "list") {
                    return (
                      <ul key={idx} className="list-disc pl-6 space-y-1.5 text-[var(--text-primary)]">
                        {block.items.map((it, iIdx) => (
                          <li key={iIdx}>{it}</li>
                        ))}
                      </ul>
                    );
                  }
                  return (
                    <p key={idx} className="leading-relaxed text-[var(--text-primary)]">
                      {block.text}
                    </p>
                  );
                })}
              </div>
            </article>

            {notesData.sources && notesData.sources.length > 0 && (
              <section className="panel p-5">
                <p className="section-label mb-3">Grounding Citations & Sources</p>
                <div className="flex flex-wrap gap-2">
                  {notesData.sources.map((s, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-xs text-[var(--text-secondary)] font-mono"
                    >
                      📄 {s.label || s.title}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <button id="download-notes-pdf-bottom" onClick={handleDownloadPDF} className="btn btn-primary cursor-pointer">
                Download PDF
              </button>
              <Link
                to={`/quiz?knowledge=${selectedKs}`}
                className="btn btn-secondary"
              >
                Take Quiz →
              </Link>
              <Link
                to={`/ask?knowledge=${selectedKs}`}
                className="btn btn-secondary"
              >
                Ask PrepMind →
              </Link>
              <Link to="/history" className="btn btn-ghost">
                View in History
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
