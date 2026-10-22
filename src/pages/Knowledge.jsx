import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { knowledgeApi } from "../services/api";
import {
  KnowledgeSignal,
  ProcessingSignal,
} from "../components/KnowledgeSignal";

const fileStages = ["UPLOADING", "QUEUED", "EXTRACTING", "CHUNKING", "EMBEDDING & INDEXING", "READY"];
const youtubeStages = [
  "QUEUED",
  "EXTRACTING TRANSCRIPT",
  "CHECKING CONTENT",
  "CHUNKING",
  "EMBEDDING & INDEXING",
  "READY",
];

// Backend status -> step in the stage list shown in the processing modal
const fileStageIndex = {
  UPLOADING: 0,
  QUEUED: 1,
  EXTRACTING_CONTENT: 2,
  CLEANING_CONTENT: 2,
  CHUNKING: 3,
  EMBEDDING: 4,
  BUILDING_KNOWLEDGE: 4,
  READY: 5,
};
const youtubeStageIndex = {
  UPLOADING: 0,
  QUEUED: 0,
  EXTRACTING_CONTENT: 1,
  CLEANING_CONTENT: 1,
  CLASSIFYING: 2,
  CHUNKING: 3,
  EMBEDDING: 4,
  BUILDING_KNOWLEDGE: 4,
  READY: 5,
};

const statusLabels = {
  UPLOADING: "Uploading",
  QUEUED: "Queued",
  EXTRACTING_CONTENT: "Extracting",
  CLASSIFYING: "Checking content",
  CLEANING_CONTENT: "Extracting",
  CHUNKING: "Chunking",
  EMBEDDING: "Embedding & indexing",
  BUILDING_KNOWLEDGE: "Finishing",
  AWAITING_REVIEW: "Needs review",
  READY: "Ready",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

// Statuses during which a job is running and can be cancelled
const CANCELLABLE_STATUSES = ["UPLOADING", "QUEUED", "EXTRACTING_CONTENT", "CLASSIFYING", "CLEANING_CONTENT", "CHUNKING", "EMBEDDING"];
const TERMINAL_STATUSES = ["READY", "FAILED", "CANCELLED", "AWAITING_REVIEW"];

function statusLabel(item) {
  if (item.type === "YOUTUBE" && item.status === "EXTRACTING_CONTENT") return "Extracting transcript";
  return statusLabels[item.status] || item.status.replace(/_/g, " ").toLowerCase();
}

const classificationLabels = {
  EDUCATIONAL: "Educational",
  NON_EDUCATIONAL: "Not study material",
  UNCERTAIN: "Uncertain",
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

function ClassificationCard({ classification }) {
  if (!classification) return null;
  const tone =
    classification.label === "EDUCATIONAL"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : classification.label === "NON_EDUCATIONAL"
        ? "border-red-500/30 bg-red-500/10 text-red-300"
        : "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return (
    <div className={`mt-6 rounded-xl border p-4 text-left text-xs ${tone}`}>
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em]">
        {classificationLabels[classification.label] || classification.label}
        {classification.confidence != null && classification.confidence > 0
          ? ` · confidence ${Math.round(classification.confidence * 100)}%`
          : ""}
        {classification.topic ? ` · ${classification.topic}` : ""}
      </p>
      <p className="mt-2 text-[var(--text-primary)]">{classification.reason}</p>
      {classification.evidence?.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-[var(--text-secondary)]">
          {classification.evidence.map((e, i) => (
            <li key={i}>“{e}”</li>
          ))}
        </ul>
      )}
    </div>
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
  cancelled,
  cancelling,
  canCancel,
  onCancel,
  review,
  reviewing,
  onApprove,
  onReject,
}) {
  const isYouTube = kind === "youtube";
  const stages = isYouTube ? youtubeStages : fileStages;
  const stageIndex = (isYouTube ? youtubeStageIndex : fileStageIndex)[stageName] ?? 0;

  const heading = duplicate
    ? "Already Imported"
    : review
      ? "Review this video"
      : cancelled
        ? "Processing Cancelled"
        : error
          ? "Processing Failed"
          : isComplete
            ? "Knowledge Ready!"
            : isYouTube
              ? "Importing YouTube Video"
              : "Ingesting Document";

  const inProgress = !isComplete && !error && !duplicate && !cancelled && !review;

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
        className="panel relative max-h-[90vh] w-full max-w-md overflow-y-auto p-8 text-center animate-fade-in-up"
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
        <h4 className="font-display text-xl text-[var(--text-primary)]">{heading}</h4>
        <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">{title}</p>

        {duplicate ? (
          <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 text-xs text-[var(--text-secondary)]">
            This video is already in your knowledge library
            {duplicate.status ? ` (status: ${duplicate.status})` : ""}. Reprocess it to
            fetch the transcript again and rebuild its index.
          </div>
        ) : review ? (
          <>
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              {review.label === "NON_EDUCATIONAL"
                ? "This video doesn't appear to be study material. Continue only if you still want to learn from it."
                : "PrepMind couldn't confidently tell whether this video is study material. Review the reason before continuing."}
            </p>
            <ClassificationCard classification={review} />
            {error && <p className="mt-4 text-xs text-red-400">{error}</p>}
          </>
        ) : cancelled ? (
          <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 text-xs text-[var(--text-secondary)]">
            {typeof cancelled === "string"
              ? cancelled
              : "Processing stopped. Nothing partial was saved. You can retry from the library."}
          </div>
        ) : error ? (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
            {error}
          </div>
        ) : (
          <div className="mt-6">
            <ProcessingSignal stage={isComplete ? stages.length - 1 : stageIndex} stages={stages} />
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
        ) : review ? (
          <div className="mt-8 flex gap-3">
            <button onClick={onReject} disabled={reviewing} className="btn btn-ghost flex-1 disabled:opacity-50">
              Cancel import
            </button>
            <button onClick={onApprove} disabled={reviewing} className="btn btn-primary flex-1 disabled:opacity-50">
              {reviewing ? "Processing…" : "Continue anyway →"}
            </button>
          </div>
        ) : inProgress ? (
          <>
            <div className="mt-8 flex gap-3">
              {canCancel && (
                <button
                  onClick={onCancel}
                  disabled={cancelling}
                  className="btn btn-ghost flex-1 hover:text-red-400 disabled:opacity-50"
                >
                  {cancelling ? "Cancelling…" : "Cancel processing"}
                </button>
              )}
              <button onClick={onClose} className="btn btn-secondary flex-1">
                Continue in background
              </button>
            </div>
            <p className="mt-3 text-[0.7rem] text-[var(--text-secondary)]">
              Closing this window doesn't stop processing. Use Cancel to stop it.
            </p>
          </>
        ) : (
          <button onClick={onClose} className="btn btn-primary mt-8 w-full">
            {error || cancelled ? "Close" : "View Knowledge Library →"}
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
  const [processingState, setProcessingState] = useState(null); // { runId, sourceId, kind, title, status, ... }
  const [notice, setNotice] = useState("");
  const [rowBusy, setRowBusy] = useState({}); // sourceId -> "cancelling"
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
    const p = processingState;
    if (p && !p.isComplete && !p.error && !p.duplicate && !p.cancelled && !p.review) {
      setNotice(
        `"${p.title}" is still processing in the background. Its status updates in the library below.`,
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
  const hasActiveSources = items.some((item) => !TERMINAL_STATUSES.includes(item.status));
  useEffect(() => {
    if (!hasActiveSources) return undefined;
    const timer = setInterval(loadKnowledge, 3000);
    return () => clearInterval(timer);
  }, [hasActiveSources]);

  // Clear the background notice once nothing is processing anymore
  useEffect(() => {
    if (!hasActiveSources && !processingState) setNotice("");
  }, [hasActiveSources, processingState]);

  const completionDetails = (data) => {
    const ready = data?.knowledgeSource;
    const times = data?.processingTimes || {};
    return [
      ready?.metadata?.wordCount ? `${ready.metadata.wordCount.toLocaleString()} words` : null,
      data?.chunkCount ? `${data.chunkCount} chunks` : null,
      times.totalSeconds != null ? `processed in ${times.totalSeconds}s` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  };

  // Runs a processing request while polling the source so the modal shows real backend
  // stages, then resolves the run into ready / review / cancelled / failed.
  const runProcessing = async (runId, sourceId, request) => {
    let stopped = false;
    (async () => {
      while (!stopped) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        if (stopped) break;
        try {
          const res = await knowledgeApi.getById(sourceId);
          const current = res?.data?.knowledgeSource;
          if (current && !stopped && !TERMINAL_STATUSES.includes(current.status)) {
            updateRun(runId, (prev) => ({ ...prev, status: current.status, title: current.title }));
          }
        } catch {
          // Polling is best-effort; the process request reports the real outcome
        }
      }
    })();

    try {
      const res = await request();
      const data = res?.data || {};
      if (data.awaitingReview) {
        updateRun(runId, (prev) => ({
          ...prev,
          title: data.knowledgeSource?.title || prev.title,
          status: "AWAITING_REVIEW",
          review: data.classification,
        }));
        return false;
      }
      if (data.knowledgeSource?.status === "CANCELLED") {
        updateRun(runId, (prev) => ({ ...prev, cancelled: data.knowledgeSource.errorMessage || true, review: null }));
        return false;
      }
      updateRun(runId, (prev) => ({
        ...prev,
        title: data.knowledgeSource?.title || prev.title,
        status: "READY",
        isComplete: true,
        review: null,
        details: completionDetails(data),
      }));
      return true;
    } catch (err) {
      if (err?.payload?.code === "PROCESSING_CANCELLED") {
        updateRun(runId, (prev) => ({ ...prev, cancelled: true, cancelling: false }));
      } else {
        updateRun(runId, (prev) => ({ ...prev, error: err.message || "Processing failed", cancelling: false }));
      }
      return false;
    } finally {
      stopped = true;
      await loadKnowledge();
    }
  };

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
    const runId = startRun({ title: file.name, status: "UPLOADING", error: null, isComplete: false });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

      const uploadRes = await knowledgeApi.upload(formData);
      const source = uploadRes?.data?.knowledgeSource;
      if (!source || !source.id) {
        throw new Error("Failed to initialize document record on server.");
      }
      updateRun(runId, (prev) => ({ ...prev, sourceId: source.id, status: "QUEUED" }));
      await runProcessing(runId, source.id, () => knowledgeApi.process(source.id));
    } catch (err) {
      updateRun(runId, (prev) => ({ ...prev, error: err.message || "Failed to upload document" }));
    } finally {
      if (fileRef.current) {
        fileRef.current.value = "";
      }
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
      updateRun(runId, (prev) => ({ ...prev, error: err.message || "Failed to import YouTube video" }));
      return false;
    }

    updateRun(runId, (prev) => ({ ...prev, sourceId: source.id, title: source.title, status: "QUEUED" }));
    await loadKnowledge();
    return runProcessing(runId, source.id, () => knowledgeApi.process(source.id));
  };

  const handleRetry = async (knowledgeItem) => {
    if (knowledgeItem.type === "YOUTUBE") {
      await runYouTubeImport({ url: knowledgeItem.youtubeUrl, reprocess: true });
      return;
    }
    const runId = startRun({
      sourceId: knowledgeItem.id,
      title: knowledgeItem.title,
      status: "QUEUED",
      error: null,
      isComplete: false,
    });
    await runProcessing(runId, knowledgeItem.id, () => knowledgeApi.process(knowledgeItem.id));
  };

  // Opens the review step for a video awaiting the user's decision
  const openReview = (knowledgeItem) => {
    startRun({
      kind: "youtube",
      sourceId: knowledgeItem.id,
      title: knowledgeItem.title,
      status: "AWAITING_REVIEW",
      review: knowledgeItem.classification || { label: "UNCERTAIN", reason: "This video needs your review." },
    });
  };

  const handleReview = async (decision) => {
    const p = processingState;
    if (!p?.sourceId) return;
    const runId = p.runId;
    updateRun(runId, (prev) => ({ ...prev, reviewing: true, error: null }));
    if (decision === "cancel") {
      try {
        await knowledgeApi.review(p.sourceId, "cancel");
        updateRun(runId, (prev) => ({ ...prev, review: null, reviewing: false, cancelled: "Import cancelled. The video was kept in your library as Cancelled; delete it or reprocess it later." }));
      } catch (err) {
        updateRun(runId, (prev) => ({ ...prev, reviewing: false, error: err.message || "Could not cancel the import" }));
      } finally {
        await loadKnowledge();
      }
      return;
    }
    updateRun(runId, (prev) => ({ ...prev, review: null, reviewing: false, status: "QUEUED" }));
    await runProcessing(runId, p.sourceId, () => knowledgeApi.review(p.sourceId, "approve"));
  };

  // Cancellation is only reported once the backend confirms it
  const cancelSource = async (sourceId, runId = null) => {
    setRowBusy((prev) => ({ ...prev, [sourceId]: "cancelling" }));
    if (runId) updateRun(runId, (prev) => ({ ...prev, cancelling: true }));
    try {
      await knowledgeApi.cancel(sourceId);
      if (runId) updateRun(runId, (prev) => ({ ...prev, cancelling: false, cancelled: true }));
    } catch (err) {
      if (runId) {
        updateRun(runId, (prev) => ({ ...prev, cancelling: false, error: err.message || "Could not cancel processing" }));
      } else {
        setError(err.message || "Could not cancel processing");
      }
    } finally {
      setRowBusy((prev) => {
        const next = { ...prev };
        delete next[sourceId];
        return next;
      });
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
          cancelled={processingState.cancelled}
          cancelling={processingState.cancelling}
          canCancel={Boolean(processingState.sourceId) && CANCELLABLE_STATUSES.includes(processingState.status)}
          onCancel={() => cancelSource(processingState.sourceId, processingState.runId)}
          review={processingState.review}
          reviewing={processingState.reviewing}
          onApprove={() => handleReview("approve")}
          onReject={() => handleReview("cancel")}
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
                const label = statusLabel(knowledgeItem);
                const isActive = CANCELLABLE_STATUSES.includes(knowledgeItem.status);
                const isCancelling = rowBusy[knowledgeItem.id] === "cancelling";

                return (
                  <div
                    key={knowledgeItem.id}
                    className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3 sm:min-w-[200px]">
                      <FileTypeIcon type={knowledgeItem.type} />
                      <div className="min-w-0">
                        <p className="break-words text-base font-medium text-[var(--text-primary)]">
                          {knowledgeItem.title}
                        </p>
                        <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                          {metaText}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      {knowledgeItem.status === "READY" ? (
                        <>
                          <p className="text-sm text-[var(--text-secondary)]">
                            {chunkCount > 0
                              ? `${chunkCount} chunks indexed`
                              : isYouTube
                                ? "Transcript processed"
                                : "Document processed"}
                            {knowledgeItem.classification?.topic ? ` · ${knowledgeItem.classification.topic}` : ""}
                          </p>
                          {knowledgeItem.errorMessage && (
                            <p className="mt-1 text-xs text-amber-400">{knowledgeItem.errorMessage}</p>
                          )}
                        </>
                      ) : knowledgeItem.status === "FAILED" ? (
                        <p className="text-sm text-red-400">
                          {knowledgeItem.errorMessage || "Processing failed"}
                        </p>
                      ) : knowledgeItem.status === "CANCELLED" ? (
                        <p className="text-sm text-[var(--text-secondary)]">
                          {knowledgeItem.errorMessage || "Processing was cancelled."}
                        </p>
                      ) : knowledgeItem.status === "AWAITING_REVIEW" ? (
                        <p className="text-sm text-amber-400">
                          {classificationLabels[knowledgeItem.classification?.label] || "Needs review"}:{" "}
                          {knowledgeItem.classification?.reason || "Review this video before it is indexed."}
                        </p>
                      ) : (
                        <p className="text-sm text-[var(--accent)]">
                          Status: {label.toLowerCase()}…
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                      <span
                        className={`status-pill ${
                          knowledgeItem.status === "READY"
                            ? "ready"
                            : knowledgeItem.status === "FAILED"
                              ? "failed"
                              : "neutral"
                        }`}
                      >
                        {label.toUpperCase()}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/knowledge/${knowledgeItem.id}`}
                          className="btn btn-ghost btn-sm"
                        >
                          View
                        </Link>
                        {isActive && (
                          <button
                            type="button"
                            onClick={() => cancelSource(knowledgeItem.id)}
                            disabled={isCancelling}
                            className="btn btn-ghost btn-sm font-mono text-[10px] hover:text-red-400 disabled:opacity-50"
                            title="Stop processing this source"
                          >
                            {isCancelling ? "Cancelling…" : "Cancel ■"}
                          </button>
                        )}
                        {knowledgeItem.status === "AWAITING_REVIEW" && (
                          <button
                            type="button"
                            onClick={() => openReview(knowledgeItem)}
                            className="btn btn-primary btn-sm font-mono text-[10px]"
                          >
                            Review
                          </button>
                        )}
                        {!isActive &&
                          knowledgeItem.status !== "AWAITING_REVIEW" &&
                          (isYouTube || ["FAILED", "CANCELLED"].includes(knowledgeItem.status)) && (
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
                        {!isYouTube && knowledgeItem.status === "READY" && (
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
              {source.errorMessage && (
                <p
                  className={`mt-2 text-sm ${source.status === "FAILED" ? "text-red-400" : source.status === "READY" ? "text-amber-400" : "text-[var(--text-secondary)]"}`}
                >
                  {source.errorMessage}
                </p>
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

          {source.classification && (
            <div className="mt-6">
              <p className="section-label">Study relevance check</p>
              <ClassificationCard classification={source.classification} />
            </div>
          )}

          {chunks.length > 0 && (
            <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5">
              <p className="section-label">Indexed chunks ({chunks.length})</p>
              <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
                {chunks.map((c, idx) => (
                  <div
                    key={c.id || idx}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs"
                  >
                    <div className="mb-1 flex items-center justify-between font-mono text-[10px] text-[var(--accent)]">
                      <span>Chunk #{c.chunkIndex + 1}</span>
                      {c.metadata?.startTime != null ? (
                        <span className="font-semibold text-amber-500">{c.metadata.section}</span>
                      ) : c.metadata?.page ? (
                        <span>Page {c.metadata.page}</span>
                      ) : c.metadata?.slide ? (
                        <span>Slide {c.metadata.slide}</span>
                      ) : null}
                    </div>
                    <p className="line-clamp-3 leading-relaxed text-[var(--text-secondary)]">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {source.status === "READY" ? (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={`/create?knowledge=${source.id}`} className="btn btn-primary flex-1">
                Create from this knowledge →
              </Link>
              <Link to={`/ask?knowledge=${source.id}`} className="btn btn-secondary">
                Ask PrepMind →
              </Link>
            </div>
          ) : (
            <div className="mt-8 flex flex-col gap-3 rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
              <span>Study tools unlock once this source is Ready.</span>
              <Link to="/knowledge" className="btn btn-secondary btn-sm">
                Manage in Knowledge
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
