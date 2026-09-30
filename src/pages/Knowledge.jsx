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

function FileTypeIcon({ type }) {
  const colors = {
    PDF: "#E74C3C",
    PPTX: "#E67E22",
    DOCX: "#2980B9",
    YouTube: "#E74C3C",
    YOUTUBE: "#E74C3C",
    TXT: "#95A5A6",
  };
  const labels = {
    PDF: "PDF",
    PPTX: "PPT",
    DOCX: "DOC",
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

function ProcessingModal({ title, stageName, onClose, isComplete, error }) {
  const stageIndex = Math.max(
    0,
    processingStages.findIndex(
      (s) => s.toLowerCase() === (stageName || "").replace(/_/g, " ").toLowerCase(),
    ),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="panel w-full max-w-md p-8 text-center animate-fade-in-up">
        <h4 className="font-display text-xl text-[var(--text-primary)]">
          {error ? "Processing Failed" : isComplete ? "Knowledge Ready!" : "Ingesting Document"}
        </h4>
        <p className="mt-1 text-xs text-[var(--text-secondary)] truncate">
          {title}
        </p>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
            {error}
          </div>
        ) : (
          <div className="mt-6">
            <ProcessingSignal
              stage={isComplete ? processingStages.length - 1 : stageIndex}
              stages={processingStages}
            />
          </div>
        )}

        {(isComplete || error) && (
          <button onClick={onClose} className="btn btn-primary mt-8 w-full">
            {error ? "Close" : "View Knowledge Library →"}
          </button>
        )}
      </div>
    </div>
  );
}

function YouTubeSection({ theme, onCreated }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError("");

    try {
      await knowledgeApi.create({
        title: title.trim() || "YouTube Video Knowledge",
        type: "YOUTUBE",
        youtubeUrl: url.trim(),
      });
      setUrl("");
      setTitle("");
      onCreated();
    } catch (err) {
      setError(err.message || "Failed to add YouTube link");
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
      <form onSubmit={handleCreate} className="mt-5 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Video Title (optional)"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
        />
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube URL"
            required
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-sm whitespace-nowrap"
          >
            {loading ? "Adding..." : "Add Link →"}
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
  const [processingState, setProcessingState] = useState(null); // { title, status, error, isComplete }
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

  const handleUpload = async (file) => {
    if (!file) return;

    const allowed = [".pdf", ".pptx", ".docx", ".txt"];
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setError("Unsupported file format. Please upload a .pdf, .docx, .pptx, or .txt document.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError("File exceeds 25MB limit.");
      return;
    }

    setError("");
    setProcessingState({
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

      setProcessingState((prev) => ({
        ...prev,
        status: "EXTRACTING_CONTENT",
      }));

      // 2. Process and Ingest Document
      await knowledgeApi.process(source.id);

      setProcessingState((prev) => ({
        ...prev,
        status: "READY",
        isComplete: true,
      }));

      // 3. Refresh list from backend
      await loadKnowledge();
    } catch (err) {
      setProcessingState((prev) => ({
        ...prev,
        error: err.message || "Failed to ingest document",
      }));
    } finally {
      if (fileRef.current) {
        fileRef.current.value = "";
      }
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
          onClose={() => setProcessingState(null)}
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
              accept=".pdf,.pptx,.docx,.txt"
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
                PDF · PPTX · DOCX · TXT
              </p>
              <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                or click to browse
              </p>
            </div>
          </div>

          <YouTubeSection
            theme={theme}
            onCreated={loadKnowledge}
          />
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
                Upload your first PDF, DOCX, PPTX, or TXT document to start generating quizzes, notes, summaries, and viva assessments.
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

                const metaTokens = [];
                if (pageCount > 0) metaTokens.push(`${pageCount} pages`);
                if (chunkCount > 0) metaTokens.push(`${chunkCount} chunks`);
                if (wordCount > 0) metaTokens.push(`${wordCount.toLocaleString()} words`);
                const metaText = metaTokens.length > 0 ? metaTokens.join(" · ") : knowledgeItem.type;

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
                          {chunkCount > 0 ? `${chunkCount} chunks indexed` : "Document processed"}
                        </p>
                      ) : knowledgeItem.status === "FAILED" ? (
                        <p className="text-sm text-red-400">
                          {knowledgeItem.errorMessage || "Processing failed"}
                        </p>
                      ) : (
                        <p className="text-sm text-[var(--accent)]">
                          Status: {knowledgeItem.status.replace(/_/g, " ").toLowerCase()}...
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
                        {knowledgeItem.status}
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/knowledge/${knowledgeItem.id}`}
                          className="btn btn-ghost btn-sm"
                        >
                          View
                        </Link>
                        <Link
                          to={`/create?knowledge=${knowledgeItem.id}`}
                          className="btn btn-primary btn-sm"
                        >
                          Create
                        </Link>
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
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Original file: {source.originalFileName || "Uploaded knowledge"}
              </p>
            </div>
            <KnowledgeSignal size={60} animated light={light} />
          </div>

          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5">
            <p className="section-label">Knowledge coverage</p>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { value: chunkCount.toString(), label: "Chunks" },
                { value: pageCount > 0 ? pageCount.toString() : "—", label: "Pages" },
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

            {chunks.length > 0 && (
              <div className="mt-6">
                <p className="section-label mb-3">Extracted Chunks Preview ({chunks.length})</p>
                <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                  {chunks.slice(0, 10).map((c) => (
                    <div
                      key={c.id || c.chunkIndex}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs"
                    >
                      <div className="flex items-center justify-between font-mono text-[0.6rem] text-[var(--text-secondary)] mb-1">
                        <span>Chunk #{c.chunkIndex}</span>
                        <span>{c.metadata?.page ? `Page ${c.metadata.page}` : c.metadata?.slide ? `Slide ${c.metadata.slide}` : ""}</span>
                      </div>
                      <p className="text-[var(--text-primary)] line-clamp-3 leading-relaxed">
                        {c.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to={`/create?knowledge=${source.id}`} className="btn btn-primary flex-1">
              Create from this knowledge →
            </Link>
            <Link to="/ask" className="btn btn-secondary">
              Ask PrepMind →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
