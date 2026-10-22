import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { KnowledgeSignal } from "./KnowledgeSignal";
import { AcademicContent } from "./AcademicContent";
import { knowledgeApi } from "../services/api";

const PROCESSING_HINT = {
  AWAITING_REVIEW: "This video is waiting for your review on the Knowledge page.",
  FAILED: "Processing failed. Retry it from the Knowledge page.",
  CANCELLED: "Processing was cancelled. Retry it from the Knowledge page.",
};

/**
 * Shared page for whole-source outputs (Summary, Notes): source selection, automatic
 * loading from ?knowledge=<id>, and explicit loading / error / empty / result states.
 */
export function GeneratedDocumentPage({
  theme,
  kind,
  sectionLabel,
  emptyTitle,
  emptyDescription,
  loadingTitle,
  loadingDetail,
  generate,
  downloadPdf,
  titlePrefix,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = searchParams.get("knowledge") || "";
  const light = theme === "light";

  const [sources, setSources] = useState([]);
  const [sourcesState, setSourcesState] = useState("loading"); // loading | ready | error
  const [sourcesError, setSourcesError] = useState("");
  const [selectedId, setSelectedId] = useState(requestedId);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState("");
  const requestRef = useRef(0);

  const loadSources = useCallback(async () => {
    setSourcesState("loading");
    try {
      const res = await knowledgeApi.getAll();
      setSources(res?.data?.knowledgeSources || []);
      setSourcesState("ready");
    } catch (err) {
      setSourcesError(err.message || "Could not load your knowledge sources.");
      setSourcesState("error");
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const readySources = sources.filter((s) => s.status === "READY");
  const selected = sources.find((s) => s.id === selectedId) || null;

  // Default to the first ready source when none was requested
  useEffect(() => {
    if (sourcesState === "ready" && !selectedId && readySources.length > 0) {
      setSelectedId(readySources[0].id);
    }
  }, [sourcesState, selectedId, readySources]);

  const run = useCallback(
    async (sourceId, regenerate) => {
      const requestId = ++requestRef.current;
      setStatus("loading");
      setError("");
      try {
        const res = await generate({ knowledgeSourceIds: [sourceId], regenerate });
        if (requestId !== requestRef.current) return;
        const data = res?.data;
        if (!data || typeof data.content !== "string" || !data.content.trim()) {
          throw new Error(`The ${kind} came back empty. Please try again.`);
        }
        setResult(data);
        setStatus("done");
      } catch (err) {
        if (requestId !== requestRef.current) return;
        setError(err.message || `Unable to generate the ${kind} right now.`);
        setStatus("error");
      }
    },
    [generate, kind],
  );

  // Opening with ?knowledge=<id> loads the saved result (or generates one) automatically
  const autoRequested = useRef("");
  useEffect(() => {
    if (sourcesState !== "ready" || !requestedId || autoRequested.current === requestedId) return;
    const source = sources.find((s) => s.id === requestedId);
    if (source && source.status === "READY") {
      autoRequested.current = requestedId;
      run(requestedId, false);
    }
  }, [sourcesState, requestedId, sources, run]);

  const selectSource = (id) => {
    requestRef.current += 1;
    setSelectedId(id);
    setResult(null);
    setStatus("idle");
    setError("");
    setSearchParams(id ? { knowledge: id } : {}, { replace: true });
  };

  const displayTitle = (result?.title || "").replace(titlePrefix, "") || selected?.title || emptyTitle;
  const pageShellStyle = { background: light ? "#F8F7F3" : "#000000" };

  // --- Source-level problems: unknown ID, not ready, nothing uploaded ---
  let blocker = null;
  if (sourcesState === "error") {
    blocker = (
      <div className="panel p-10 text-center" role="alert">
        <h3 className="font-display text-2xl text-[var(--text-primary)]">Couldn't load your sources</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{sourcesError}</p>
        <button type="button" onClick={loadSources} className="btn btn-primary mt-6">
          Retry
        </button>
      </div>
    );
  } else if (sourcesState === "ready" && requestedId && !selected) {
    blocker = (
      <div className="panel p-10 text-center" role="alert">
        <h3 className="font-display text-2xl text-[var(--text-primary)]">Source not found</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          This knowledge source doesn't exist or doesn't belong to your account.
        </p>
        <Link to="/knowledge" className="btn btn-primary mt-6 inline-flex">
          Go to Knowledge
        </Link>
      </div>
    );
  } else if (sourcesState === "ready" && selected && selected.status !== "READY") {
    blocker = (
      <div className="panel p-10 text-center">
        <h3 className="font-display text-2xl text-[var(--text-primary)]">"{selected.title}" isn't ready yet</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {PROCESSING_HINT[selected.status] ||
            `It is still being processed (${selected.status.replace(/_/g, " ").toLowerCase()}). Try again when it shows Ready.`}
        </p>
        <Link to="/knowledge" className="btn btn-primary mt-6 inline-flex">
          Open Knowledge
        </Link>
      </div>
    );
  } else if (sourcesState === "ready" && readySources.length === 0) {
    blocker = (
      <div className="panel p-10 text-center">
        <KnowledgeSignal size={60} animated light={light} />
        <h3 className="mt-4 font-display text-2xl text-[var(--text-primary)]">No ready sources yet</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-secondary)]">
          Upload a document or import a YouTube video, then come back once it shows Ready.
        </p>
        <Link to="/knowledge" className="btn btn-primary mt-6 inline-flex">
          + Add knowledge
        </Link>
      </div>
    );
  }

  return (
    <div className="page-shell" style={pageShellStyle}>
      <div className="page-inner max-w-4xl">
        <div className="mb-8 flex flex-col gap-4 animate-fade-in-up sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {selected && (
              <Link
                to={`/knowledge/${selected.id}`}
                className="mb-3 inline-block text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                ← Back to {selected.title}
              </Link>
            )}
            <p className="section-label">{sectionLabel}</p>
            <h1 className="mt-4 break-words font-display text-4xl text-[var(--text-primary)]">{displayTitle}</h1>
          </div>

          {readySources.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor={`${kind}-source-select`} className="sr-only">
                Knowledge source
              </label>
              <select
                id={`${kind}-source-select`}
                value={selectedId}
                onChange={(e) => selectSource(e.target.value)}
                disabled={status === "loading"}
                className="max-w-[16rem] rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs text-[var(--text-primary)]"
              >
                {selected && selected.status !== "READY" && (
                  <option value={selected.id} disabled>
                    {selected.title} ({selected.status.toLowerCase()})
                  </option>
                )}
                {readySources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.type === "YOUTUBE" ? "YouTube" : s.type})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => run(selectedId, status === "done")}
                disabled={!selected || selected.status !== "READY" || status === "loading"}
                className="btn btn-primary btn-sm whitespace-nowrap disabled:opacity-50"
              >
                {status === "loading" ? "Generating…" : status === "done" ? "Regenerate ↻" : `Generate ${kind} →`}
              </button>
            </div>
          )}
        </div>

        {sourcesState === "loading" ? (
          <div className="panel p-10" aria-busy="true">
            <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--surface-elevated)]" />
            <div className="mt-4 h-3 w-full animate-pulse rounded bg-[var(--surface-elevated)]" />
            <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-[var(--surface-elevated)]" />
          </div>
        ) : blocker ? (
          blocker
        ) : status === "loading" ? (
          <div className="panel flex flex-col items-center gap-5 p-12 text-center" aria-busy="true">
            <KnowledgeSignal size={80} animated light={light} />
            <div>
              <h3 className="font-display text-2xl text-[var(--text-primary)]">{loadingTitle}</h3>
              <p className="mt-2 font-mono text-xs uppercase tracking-widest text-[var(--text-secondary)]">
                {loadingDetail}
              </p>
              <p className="mt-3 text-xs text-[var(--text-secondary)]">
                Long documents are read section by section, so this can take a minute.
              </p>
            </div>
          </div>
        ) : status === "error" ? (
          <div className="panel p-8 text-center" role="alert">
            <h3 className="font-display text-2xl text-[var(--text-primary)]">Generation failed</h3>
            <p className="mx-auto mt-3 max-w-lg text-sm text-red-400">{error}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => run(selectedId, false)} className="btn btn-primary">
                Retry
              </button>
              {selected && (
                <Link to={`/knowledge/${selected.id}`} className="btn btn-secondary">
                  View source
                </Link>
              )}
            </div>
          </div>
        ) : status === "done" && result ? (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-wrap items-center gap-3">
              {result.generationTimeSeconds != null && (
                <span className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1 font-mono text-xs text-[var(--accent)]">
                  ⏱ Generated in {result.generationTimeSeconds}s
                </span>
              )}
              {result.cached && (
                <span className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1 font-mono text-xs text-[var(--text-secondary)]">
                  Saved {result.createdAt ? new Date(result.createdAt).toLocaleString() : "earlier"}
                </span>
              )}
              {result.coverage?.condensed && (
                <span className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1 font-mono text-xs text-[var(--text-secondary)]">
                  Covers all {result.coverage.chunks} chunks in {result.coverage.sections} sections
                </span>
              )}
              <button
                type="button"
                onClick={() => downloadPdf(result, selected?.title || "Knowledge Source")}
                className="btn btn-secondary btn-sm ml-auto font-mono text-xs"
              >
                Download PDF
              </button>
            </div>

            <article className="panel rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-10">
              <AcademicContent text={result.content} />
            </article>

            {Array.isArray(result.sources) && result.sources.length > 0 && (
              <section className="panel p-5">
                <p className="section-label mb-3">Source references</p>
                <div className="flex flex-wrap gap-2">
                  {result.sources.slice(0, 24).map((s, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 font-mono text-xs text-[var(--text-secondary)]"
                    >
                      {s.label || s.title}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <div className="flex flex-wrap gap-3">
              {kind !== "notes" && (
                <Link to={`/notes?knowledge=${selectedId}`} className="btn btn-secondary">
                  Create notes →
                </Link>
              )}
              {kind !== "summary" && (
                <Link to={`/summary?knowledge=${selectedId}`} className="btn btn-secondary">
                  Summarize →
                </Link>
              )}
              <Link to={`/quiz?knowledge=${selectedId}`} className="btn btn-secondary">
                Generate quiz →
              </Link>
              <Link to={`/ask?knowledge=${selectedId}`} className="btn btn-secondary">
                Ask PrepMind →
              </Link>
              <Link to="/history" className="btn btn-ghost">
                View in history
              </Link>
            </div>
          </div>
        ) : (
          <div className="panel p-12 text-center animate-fade-in-up">
            <KnowledgeSignal size={60} animated light={light} />
            <h3 className="mt-4 font-display text-2xl text-[var(--text-primary)]">{emptyTitle}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-secondary)]">{emptyDescription}</p>
            <button
              type="button"
              onClick={() => run(selectedId, false)}
              disabled={!selected}
              className="btn btn-primary mt-6 inline-flex disabled:opacity-50"
            >
              Generate {kind} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
