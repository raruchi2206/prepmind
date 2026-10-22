import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { knowledgeApi } from "../services/api";
import {
  KnowledgeSignal,
  ProcessingSignal,
} from "../components/KnowledgeSignal";

const processingStages = [
  "UPLOADING",
  "EXTRACTING CONTENT",
  "CLEANING CONTENT",
  "CHUNKING",
  "BUILDING KNOWLEDGE",
  "READY",
];

const youtubeStages = [
  "IMPORTING",
  "EXTRACTING TRANSCRIPT",
  "CHUNKING",
  "INDEXING",
  "READY",
];

const youtubeStageIndex = {
  UPLOADING: 0,
  EXTRACTING_CONTENT: 1,
  CLEANING_CONTENT: 1,
  CHUNKING: 2,
  EMBEDDING: 3,
  BUILDING_KNOWLEDGE: 3,
  READY: 4,
};

const youtubeStatusLabels = {
  UPLOADING: "Importing",
  EXTRACTING_CONTENT: "Extracting transcript",
  CLEANING_CONTENT: "Extracting transcript",
  CHUNKING: "Chunking",
  EMBEDDING: "Indexing",
  BUILDING_KNOWLEDGE: "Indexing",
  READY: "Ready",
  FAILED: "Failed",
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

// Mirrors backend/src/utils/youtube.js so obvious mistakes are caught before a request
function isValidYouTubeUrl(raw) {
  try {
    const trimmed = raw.trim();
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, "");
    const parts = url.pathname.split("/").filter(Boolean);
    if (host === "youtu.be") return YOUTUBE_ID.test(parts[0] || "");
    if (host !== "youtube.com" && host !== "youtube-nocookie.com") return false;
    if (parts[0] === "watch") return YOUTUBE_ID.test(url.searchParams.get("v") || "");
    return ["shorts", "embed", "live", "v"].includes(parts[0]) && YOUTUBE_ID.test(parts[1] || "");
  } catch {
    return false;
  }
}

function formatDuration(seconds) {
  const total = Math.round(Number(seconds) || 0);
  if (!total) return null;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${String(s).padStart(2, "0")}s`;
}

function transcriptLanguageLabel(youtube) {
  if (!youtube || !youtube.language) return null;
  return `${youtube.language}${youtube.isGenerated ? " (auto)" : ""}`;
}

function FileTypeIcon({ type }) {
  const colors = {
    PDF: "#E74C3C",
    IMAGE: "#10B981",
    PPTX: "#E67E22",
    PPT: "#E67E22",
    DOCX: "#2980B9",
    DOC: "#2980B9",
    YouTube: "#E74C3C",
    YOUTUBE: "#E74C3C",
    TXT: "#95A5A6",
  };
  const labels = {
    PDF: "PDF",
    IMAGE: "IMG",
    PPTX: "PPT",
    PPT: "PPT",
    DOCX: "DOC",
    DOC: "DOC",
    YouTube: "▶",
    YOUTUBE: "▶",
    TXT: "TXT",
  };
  return (
    <span
      className="inline-flex items-center justify-center rounded-md border px-2 py-1 font-mono text-[0.58rem] uppercase tracking-[0.14em]"
      style={{
        color: colors[type] || "#999",
        borderColor: `${colors[type] || "#999"}66`,
      }}
    >
      {labels[type] || type}
    </span>
  );
}

function ProcessingModal({
  title,
  stageName,
  onClose,
  isComplete,
  error,
  kind,
  duplicate,
  onReprocess,
  details,
}) {
  const isYouTube = kind === "youtube";
  const stages = isYouTube ? youtubeStages : processingStages;
  const stageIndex = isYouTube
    ? (youtubeStageIndex[stageName] ?? 0)
    : Math.max(
        0,
        processingStages.findIndex(
          (s) => s.toLowerCase() === (stageName || "").replace(/_/g, " ").toLowerCase(),
        ),
      );

  const heading = duplicate
    ? "Already Imported"
    : error
      ? "Processing Failed"
      : isComplete
        ? "Knowledge Ready!"
        : isYouTube
          ? "Importing YouTube Video"
          : "Ingesting Document";

  const inProgress = !isComplete && !error && !duplicate;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        className="panel relative w-full max-w-md p-8 text-center animate-fade-in-up"
      >
        <button
          type="button"
          onClick={onClose}
          className="icon-button absolute right-4 top-4"
          aria-label={inProgress ? "Close and continue in background" : "Close"}
          title={inProgress ? "Close — processing continues in the background" : "Close"}
        >
          ✕
        </button>
        <h4 className="font-display text-xl text-[var(--text-primary)]">
          {heading}
        </h4>
        <p className="mt-1 text-xs text-[var(--text-secondary)] truncate">
          {title}
        </p>

        {duplicate ? (
          <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 text-xs text-[var(--text-secondary)]">
            This video is already in your knowledge library
            {duplicate.status ? ` (status: ${duplicate.status})` : ""}. Reprocess it to
            fetch the transcript again and rebuild its index.
          </div>
        ) : error ? (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
            {error}
          </div>
        ) : (
          <div className="mt-6">
            <ProcessingSignal
              stage={isComplete ? stages.length - 1 : stageIndex}
              stages={stages}
            />
          </div>
        )}

        {isComplete && details && (
          <p className="mt-6 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            {details}
          </p>
        )}

        {duplicate ? (
          <div className="mt-8 flex gap-3">
            <button onClick={onClose} className="btn btn-ghost flex-1">
              Cancel
            </button>
            <button onClick={onReprocess} className="btn btn-primary flex-1">
              Reprocess ↻
            </button>
          </div>
        ) : inProgress ? (
          <>
            <button onClick={onClose} className="btn btn-ghost mt-8 w-full">
              Continue in background
            </button>
            <p className="mt-3 text-[0.7rem] text-[var(--text-secondary)]">
              You can close this window. Processing keeps running and the library shows its
              status.
            </p>
          </>
        ) : (
          <button onClick={onClose} className="btn btn-primary mt-8 w-full">
            {error ? "Close" : "View Knowledge Library →"}
          </button>
        )}
      </div>
    </div>
  );
}

function YouTubeSection({ onImport }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    if (!isValidYouTubeUrl(url)) {
      setError(
        "Invalid YouTube URL. Use youtube.com/watch?v=…, youtu.be/… or youtube.com/shorts/… links.",
      );
      return;
    }
    setLoading(true);
    setError("");

    try {
      const ok = await onImport({ url: url.trim(), title: title.trim() || undefined });
      if (ok) {
        setUrl("");
        setTitle("");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel p-6">
      <p className="section-label">Option 2</p>
      <h3 className="mt-3 font-display text-2xl text-[var(--text-primary)]">
        Add YouTube video
      </h3>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">
        Learns from the video's public captions. Videos without captions can't be imported.
      </p>
      <form onSubmit={handleCreate} className="mt-5 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Custom title (optional — defaults to the video title)"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
        />
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube URL"
            maxLength={2048}
            required
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-sm whitespace-nowrap"
          >
            {loading ? "Importing..." : "Add Link →"}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </form>
    </div>
  );
}

export default function Knowledge({ theme }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [processingState, setProcessingState] = useState(null); // { runId, title, status, error, isComplete }
  const [notice, setNotice] = useState("");
  const runRef = useRef(0);

  // Each ingestion run owns the modal only while it is the latest run, so a run that
  // finishes after the modal was closed (or replaced) never reopens or overwrites it.
  const startRun = (state) => {
    const runId = ++runRef.current;
    setProcessingState({ ...state, runId });
    return runId;
  };
  const updateRun = (runId, update) =>
    setProcessingState((prev) => (prev && prev.runId === runId ? update(prev) : prev));

  const closeProcessing = () => {
    if (processingState && !processingState.isComplete && !processingState.error && !processingState.duplicate) {
      setNotice(
        `"${processingState.title}" is still processing in the background. Its status updates in the library below.`,
      );
    }
    setProcessingState(null);
  };
  const fileRef = useRef(null);
  const light = theme === "light";

  const loadKnowledge = async () => {
    try {
      setError("");
      const res = await knowledgeApi.getAll();
      const list = res?.data?.knowledgeSources || [];
      setItems(list);
    } catch (err) {
      setError(err.message || "Failed to load knowledge sources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledge();
  }, []);

  // Keep library statuses live while any source is still being processed
  const hasActiveSources = items.some(
    (item) => item.status !== "READY" && item.status !== "FAILED",
  );
  useEffect(() => {
    if (!hasActiveSources) return undefined;
    const timer = setInterval(loadKnowledge, 3000);
    return () => clearInterval(timer);
  }, [hasActiveSources]);

  // Clear the background notice once nothing is processing anymore
  useEffect(() => {
    if (!hasActiveSources && !processingState) setNotice("");
  }, [hasActiveSources, processingState]);

  const handleUpload = async (file) => {
    if (!file) return;

    const allowed = [".pdf", ".jpg", ".jpeg", ".png", ".pptx", ".ppt", ".docx", ".doc", ".txt"];
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setError("Unsupported file format. Please upload PDF, Image (JPG/PNG), PowerPoint (PPT/PPTX), Word (DOC/DOCX), or Text (TXT).");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError("File exceeds 25MB limit.");
      return;
    }

    setError("");
    const runId = startRun({
      title: file.name,
      status: "UPLOADING",
      error: null,
      isComplete: false,
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

      // 1. Upload file to server
      const uploadRes = await knowledgeApi.upload(formData);
      const source = uploadRes?.data?.knowledgeSource;
      if (!source || !source.id) {
        throw new Error("Failed to initialize document record on server.");
      }

      updateRun(runId, (prev) => ({
        ...prev,
        status: "EXTRACTING_CONTENT",
      }));

      // 2. Process and Ingest Document
      await knowledgeApi.process(source.id);

      updateRun(runId, (prev) => ({
        ...prev,
        status: "READY",
        isComplete: true,
      }));

      // 3. Refresh list from backend
      await loadKnowledge();
    } catch (err) {
      updateRun(runId, (prev) => ({
        ...prev,
        error: err.message || "Failed to ingest document",
      }));
    } finally {
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  };

  // Runs /process while polling the source so the modal shows real backend stages
  const processWithPolling = async (sourceId, runId) => {
    let stopped = false;
    const poll = async () => {
      while (!stopped) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        if (stopped) break;
        try {
          const res = await knowledgeApi.getById(sourceId);
          const current = res?.data?.knowledgeSource;
          if (current && !stopped && current.status !== "READY" && current.status !== "FAILED") {
            updateRun(runId, (prev) => ({
              ...prev,
              status: current.status,
              title: current.title,
            }));
          }
        } catch {
          // Polling is best-effort; the process request reports the real outcome
        }
      }
    };
    poll();
    try {
      return await knowledgeApi.process(sourceId);
    } finally {
      stopped = true;
    }
  };

  const runYouTubeImport = async ({ url, title, reprocess = false }) => {
    setError("");
    const runId = startRun({
      kind: "youtube",
      title: title || url,
      status: "UPLOADING",
      error: null,
      isComplete: false,
      request: { url, title },
    });

    let source;
    try {
      const res = await knowledgeApi.importYouTube({ url, title, reprocess });
      source = res?.data?.knowledgeSource;
      if (!source?.id) {
        throw new Error("Failed to create the YouTube source on the server.");
      }
    } catch (err) {
      if (err?.payload?.code === "DUPLICATE_YOUTUBE_SOURCE") {
        const existing = err.payload.details?.knowledgeSource;
        updateRun(runId, (prev) => ({
          ...prev,
          title: existing?.title || prev.title,
          duplicate: existing || {},
        }));
        return false;
      }
      updateRun(runId, (prev) => ({
        ...prev,
        error: err.message || "Failed to import YouTube video",
      }));
      return false;
    }

    updateRun(runId, (prev) => ({
      ...prev,
      title: source.title,
      status: "EXTRACTING_CONTENT",
    }));
    await loadKnowledge();

    try {
      const res = await processWithPolling(source.id, runId);
      const ready = res?.data?.knowledgeSource;
      const times = res?.data?.processingTimes || {};
      const details = [
        ready?.metadata?.wordCount ? `${ready.metadata.wordCount.toLocaleString()} words` : null,
        res?.data?.chunkCount ? `${res.data.chunkCount} chunks` : null,
        times.totalSeconds != null ? `processed in ${times.totalSeconds}s` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      updateRun(runId, (prev) => ({
        ...prev,
        title: ready?.title || prev.title,
        status: "READY",
        isComplete: true,
        details,
      }));
      return true;
    } catch (err) {
      updateRun(runId, (prev) => ({
        ...prev,
        error: err.message || "Failed to process YouTube video",
      }));
      return false;
    } finally {
      await loadKnowledge();
    }
  };

  const handleRetry = async (knowledgeItem) => {
    if (knowledgeItem.type === "YOUTUBE") {
      await runYouTubeImport({ url: knowledgeItem.youtubeUrl, reprocess: true });
      return;
    }
    const runId = startRun({
      title: knowledgeItem.title,
      status: "EXTRACTING_CONTENT",
      error: null,
      isComplete: false,
    });
    try {
      await knowledgeApi.process(knowledgeItem.id);
      updateRun(runId, (prev) => ({ ...prev, status: "READY", isComplete: true }));
    } catch (err) {
      updateRun(runId, (prev) => ({
        ...prev,
        error: err.message || "Failed to process document",
      }));
    } finally {
      await loadKnowledge();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (id) => {
    try {
      await knowledgeApi.delete(id);
      await loadKnowledge();
    } catch (err) {
      setError(err.message || "Failed to delete knowledge source");
    }
  };

  return (
    <div
      className="page-shell"
      style={{ background: light ? "#F8F7F3" : "#000000" }}
    >
      {processingState && (
        <ProcessingModal
          title={processingState.title}
          stageName={processingState.status}
          error={processingState.error}
          isComplete={processingState.isComplete}
          kind={processingState.kind}
          duplicate={processingState.duplicate}
          details={processingState.details}
          onReprocess={() =>
            runYouTubeImport({ ...processingState.request, reprocess: true })
          }
          onClose={closeProcessing}
        />
      )}

      <div className="page-inner">
        <div className="mb-8 animate-fade-in-up">
          <p className="section-label">Knowledge</p>
          <h1 className="page-title mt-4">Your knowledge</h1>
          <p className="page-subtitle mt-3">
            Upload once. Use your knowledge whenever you prepare.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 text-sm text-[var(--text-secondary)]">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        <div className="mb-10 grid gap-6 lg:grid-cols-2 animate-fade-in-up delay-100">
          <div
            className={`panel p-6 transition-all ${dragging ? "border-[var(--ring)]" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <p className="section-label">Option 1</p>
            <h3 className="mt-3 font-display text-2xl text-[var(--text-primary)]">
              Upload files
            </h3>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.pptx,.ppt,.docx,.doc,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleUpload(e.target.files[0]);
                }
              }}
            />
            <div
              onClick={() => fileRef.current?.click()}
              className="mt-5 cursor-pointer rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-elevated)] p-10 text-center transition-colors hover:border-[var(--ring)]"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] text-2xl text-[var(--text-secondary)]">
                ⌁
              </div>
              <p className="text-sm text-[var(--text-primary)]">
                Drag and drop your files here
              </p>
              <p className="mt-3 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                PDF · JPG · PNG · PPT/PPTX · DOC/DOCX · TXT
              </p>
              <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                or click to browse
              </p>
            </div>
          </div>

          <YouTubeSection onImport={runYouTubeImport} />
        </div>

        <section className="animate-fade-in-up delay-200">
          <div className="mb-4 flex items-center justify-between">
            <p className="section-label">
              Knowledge library · {items.length} {items.length === 1 ? "source" : "sources"}
            </p>
          </div>

          {loading ? (
            <div className="panel p-12 text-center text-sm text-[var(--text-secondary)]">
              Loading knowledge library...
            </div>
          ) : items.length === 0 ? (
            <div className="panel p-12 text-center animate-fade-in-up">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)] text-2xl text-[var(--text-secondary)]">
                ⌁
              </div>
              <h3 className="font-display text-2xl text-[var(--text-primary)]">
                No knowledge sources yet
              </h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                Upload your first PDF, image, Word, PowerPoint, or text document, or import a YouTube video, to start generating quizzes, notes, summaries, and viva assessments.
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                className="btn btn-primary mt-6 inline-flex items-center gap-2"
              >
                + Add Knowledge
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((knowledgeItem) => {
                const chunkCount = knowledgeItem.metadata?.chunkCount ?? 0;
                const pageCount = knowledgeItem.metadata?.pageCount ?? 0;
                const wordCount = knowledgeItem.metadata?.wordCount ?? 0;

                const isYouTube = knowledgeItem.type === "YOUTUBE";
                const metaTokens = [];
                if (isYouTube) {
                  metaTokens.push("YouTube");
                  const lang = transcriptLanguageLabel(knowledgeItem.youtube);
                  if (lang) metaTokens.push(lang);
                  const duration = formatDuration(knowledgeItem.youtube?.durationSeconds);
                  if (duration) metaTokens.push(duration);
                }
                if (pageCount > 0) metaTokens.push(`${pageCount} pages`);
                if (chunkCount > 0) metaTokens.push(`${chunkCount} chunks`);
                if (wordCount > 0) metaTokens.push(`${wordCount.toLocaleString()} words`);
                const metaText = metaTokens.length > 0 ? metaTokens.join(" · ") : knowledgeItem.type;
                const statusLabel = isYouTube
                  ? youtubeStatusLabels[knowledgeItem.status] || knowledgeItem.status
                  : knowledgeItem.status.replace(/_/g, " ").toLowerCase();

                return (
                  <div
                    key={knowledgeItem.id}
                    className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-3 sm:min-w-[200px]">
                      <FileTypeIcon type={knowledgeItem.type} />
                      <div>
                        <p className="text-base font-medium text-[var(--text-primary)]">
                          {knowledgeItem.title}
                        </p>
                        <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                          {metaText}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1">
                      {knowledgeItem.status === "READY" ? (
                        <p className="text-sm text-[var(--text-secondary)]">
                          {chunkCount > 0
                            ? `${chunkCount} chunks indexed`
                            : isYouTube
                              ? "Transcript processed"
                              : "Document processed"}
                        </p>
                      ) : knowledgeItem.status === "FAILED" ? (
                        <p className="text-sm text-red-400">
                          {knowledgeItem.errorMessage || "Processing failed"}
                        </p>
                      ) : (
                        <p className="text-sm text-[var(--accent)]">
                          Status: {statusLabel}...
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 sm:justify-end">
                      <span
                        className={`status-pill ${
                          knowledgeItem.status === "READY"
                            ? "ready"
                            : knowledgeItem.status === "FAILED"
                              ? "failed"
                              : "neutral"
                        }`}
                      >
                        {isYouTube ? statusLabel.toUpperCase() : knowledgeItem.status}
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/knowledge/${knowledgeItem.id}`}
                          className="btn btn-ghost btn-sm"
                        >
                          View
                        </Link>
                        {(isYouTube || knowledgeItem.status === "FAILED") && (
                          <button
                            type="button"
                            onClick={() => handleRetry(knowledgeItem)}
                            className="btn btn-ghost btn-sm font-mono text-[10px]"
                            title={
                              isYouTube
                                ? "Fetch the transcript again and rebuild the index"
                                : "Retry processing this document"
                            }
                          >
                            {isYouTube ? "Reprocess ↻" : "Retry ↻"}
                          </button>
                        )}
                        {!isYouTube && (
                        <button
                          type="button"
                          onClick={async () => {
                            const runId = startRun({
                              title: knowledgeItem.title,
                              status: "EMBEDDING",
                              error: null,
                              isComplete: false,
                            });
                            try {
                              await knowledgeApi.reindex(knowledgeItem.id);
                              updateRun(runId, (prev) => ({
                                ...prev,
                                status: "READY",
                                isComplete: true,
                              }));
                              await loadKnowledge();
                            } catch (err) {
                              updateRun(runId, (prev) => ({
                                ...prev,
                                error: err.message || "Failed to re-index",
                              }));
                            }
                          }}
                          className="btn btn-ghost btn-sm font-mono text-[10px]"
                          title="Re-index vectors into FAISS"
                        >
                          Re-index ↻
                        </button>
                        )}
                        {knowledgeItem.status === "READY" && (
                          <Link
                            to={`/create?knowledge=${knowledgeItem.id}`}
                            className="btn btn-primary btn-sm"
                          >
                            Create
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(knowledgeItem.id)}
                          className="p-1 text-sm text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                          title="Delete knowledge source"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function KnowledgeDetail({ theme }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const light = theme === "light";

  const [source, setSource] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);
        const [sourceRes, chunksRes] = await Promise.all([
          knowledgeApi.getById(id),
          knowledgeApi.getChunks(id).catch(() => ({ data: { chunks: [] } })),
        ]);
        setSource(sourceRes?.data?.knowledgeSource || null);
        setChunks(chunksRes?.data?.chunks || []);
      } catch (err) {
        setError(err.message || "Failed to load knowledge source details");
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      fetchDetail();
    }
  }, [id]);

  if (loading) {
    return (
      <div
        className="page-shell flex items-center justify-center p-8"
        style={{ background: light ? "#F8F7F3" : "#000000" }}
      >
        <p className="text-sm text-[var(--text-secondary)]">Loading source details...</p>
      </div>
    );
  }

  if (error || !source) {
    return (
      <div
        className="page-shell p-8"
        style={{ background: light ? "#F8F7F3" : "#000000" }}
      >
        <div className="page-inner max-w-4xl">
          <button onClick={() => navigate("/knowledge")} className="btn btn-ghost btn-sm mb-4">
            ← Knowledge library
          </button>
          <div className="panel p-8 text-center">
            <p className="text-red-400">{error || "Knowledge source not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  const chunkCount = source.metadata?.chunkCount ?? chunks.length ?? 0;
  const pageCount = source.metadata?.pageCount ?? 0;
  const wordCount = source.metadata?.wordCount ?? 0;

  return (
    <div
      className="page-shell"
      style={{ background: light ? "#F8F7F3" : "#000000" }}
    >
      <div className="page-inner max-w-4xl">
        <button
          onClick={() => navigate("/knowledge")}
          className="btn btn-ghost btn-sm mb-8"
        >
          ← Knowledge library
        </button>

        <div className="panel p-6 sm:p-8 animate-fade-in-up">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <FileTypeIcon type={source.type} />
                <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  {pageCount > 0 ? `${pageCount} pages · ` : ""}
                  {chunkCount} chunks indexed
                </span>
              </div>
              <h1 className="mt-4 font-display text-4xl text-[var(--text-primary)]">
                {source.title}
              </h1>
              {source.type === "YOUTUBE" ? (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {source.youtube?.channel ? `${source.youtube.channel} · ` : ""}
                  <a
                    href={source.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-[var(--text-primary)]"
                  >
                    Watch on YouTube ↗
                  </a>
                </p>
              ) : (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Original file: {source.originalFileName || "Uploaded knowledge"}
                </p>
              )}
              {source.status === "FAILED" && source.errorMessage && (
                <p className="mt-2 text-sm text-red-400">{source.errorMessage}</p>
              )}
            </div>
            <KnowledgeSignal size={60} animated light={light} />
          </div>

          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5">
            <p className="section-label">Document Overview</p>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { value: chunkCount.toString(), label: "Chunks Indexed" },
                source.type === "YOUTUBE"
                  ? {
                      value: transcriptLanguageLabel(source.youtube) || "—",
                      label: "Transcript Language",
                    }
                  : { value: pageCount > 0 ? pageCount.toString() : "—", label: "Pages" },
                { value: wordCount > 0 ? wordCount.toLocaleString() : "—", label: "Words" },
                { value: source.status, label: "Status" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
                >
                  <p className="font-display text-2xl text-[var(--text-primary)] truncate">
                    {stat.value}
                  </p>
                  <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            {source.metadata?.processingTimes?.totalSeconds != null && (
              <p className="mt-4 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                {[
                  ["Extraction", source.metadata.processingTimes.extractionSeconds],
                  ["Chunking", source.metadata.processingTimes.chunkingSeconds],
                  ["Indexing", source.metadata.processingTimes.indexingSeconds],
                  ["Total", source.metadata.processingTimes.totalSeconds],
                ]
                  .filter(([, value]) => value != null)
                  .map(([label, value]) => `${label} ${value}s`)
                  .join(" · ")}
              </p>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to={`/create?knowledge=${source.id}`} className="btn btn-primary flex-1">
              Create from this knowledge →
            </Link>
            <Link to={`/ask?knowledge=${source.id}`} className="btn btn-secondary">
              Ask PrepMind →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
