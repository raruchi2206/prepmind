import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  KnowledgeSignal,
  ProcessingSignal,
} from "../components/KnowledgeSignal";

const mockKnowledge = [
  {
    id: 1,
    title: "DBMS Notes",
    type: "PDF",
    meta: "42 pages",
    status: "READY",
    topics: 14,
  },
  {
    id: 2,
    title: "AI/ML Lecture",
    type: "YouTube",
    meta: "38:42",
    status: "READY",
    topics: 11,
  },
  {
    id: 3,
    title: "Operating Systems",
    type: "PPTX",
    meta: "56 slides",
    status: "READY",
    topics: 18,
  },
  {
    id: 4,
    title: "DBMS Normalization",
    type: "YouTube",
    meta: "24:11",
    status: "READY",
    topics: 7,
  },
  {
    id: 5,
    title: "Computer Networks",
    type: "DOCX",
    meta: "28 pages",
    status: "READY",
    topics: 9,
  },
];

const docStages = [
  "UPLOADING",
  "READING DOCUMENT",
  "EXTRACTING CONTENT",
  "BUILDING KNOWLEDGE",
  "READY",
];
const ytStages = [
  "FETCHING VIDEO",
  "READING AVAILABLE TRANSCRIPT",
  "EXTRACTING TOPICS",
  "BUILDING KNOWLEDGE",
  "READY",
];

function FileTypeIcon({ type }) {
  const colors = {
    PDF: "#E74C3C",
    PPTX: "#E67E22",
    DOCX: "#2980B9",
    YouTube: "#E74C3C",
    TXT: "#95A5A6",
  };
  const labels = {
    PDF: "PDF",
    PPTX: "PPT",
    DOCX: "DOC",
    YouTube: "▶",
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

function ProcessingModal({ stages, stage, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="panel w-full max-w-md p-10 text-center">
        <ProcessingSignal stage={stage} stages={stages} />
        {stage === stages.length - 1 && (
          <button onClick={onClose} className="btn btn-primary mt-8">
            View knowledge →
          </button>
        )}
      </div>
    </div>
  );
}

function YouTubeSection({ theme, onAdd }) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState(0);
  const light = theme === "light";

  const handleAnalyze = () => {
    if (!url.trim()) return;
    setPreview({
      title: "Database Management Systems — Complete Lecture Series",
      channel: "TechEdu Pro",
      duration: "38:42",
      thumbnail:
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=320&h=180&fit=crop&auto=format",
    });
  };

  const handleProcess = () => {
    setProcessing(true);
    setStage(0);
    const interval = setInterval(() => {
      setStage((s) => {
        if (s >= ytStages.length - 1) {
          clearInterval(interval);
          return s;
        }
        return s + 1;
      });
    }, 1200);
  };

  return (
    <div className="panel p-6">
      <p className="section-label">Option 2</p>
      <h3 className="mt-3 font-display text-2xl text-[var(--text-primary)]">
        Add YouTube video
      </h3>
      <div className="mt-5 flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste YouTube URL"
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
        />
        <button
          onClick={handleAnalyze}
          className="btn btn-primary btn-sm whitespace-nowrap"
        >
          Analyze →
        </button>
      </div>

      {preview && (
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <div className="flex gap-3">
            <img
              src={preview.thumbnail}
              alt="video"
              className="h-16 w-24 rounded-xl object-cover"
            />
            <div>
              <p className="text-sm text-[var(--text-primary)]">
                {preview.title}
              </p>
              <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                {preview.channel}
              </p>
              <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                {preview.duration}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Topics detected: 8+", "Transcript: Available"].map((tag) => (
              <span key={tag} className="source-pill">
                {tag}
              </span>
            ))}
          </div>
          <button
            onClick={handleProcess}
            className="btn btn-primary mt-4 w-full"
          >
            Build knowledge →
          </button>
        </div>
      )}

      {processing && (
        <ProcessingModal
          stages={ytStages}
          stage={stage}
          onClose={() => {
            setProcessing(false);
            onAdd();
          }}
        />
      )}
    </div>
  );
}

export default function Knowledge({ theme }) {
  const navigate = useNavigate();
  const [items, setItems] = useState(mockKnowledge);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState(0);
  const fileRef = useRef(null);
  const light = theme === "light";

  const triggerProcess = () => {
    setProcessing(true);
    setStage(0);
    const interval = setInterval(() => {
      setStage((s) => {
        if (s >= docStages.length - 1) {
          clearInterval(interval);
          return s;
        }
        return s + 1;
      });
    }, 1000);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    triggerProcess();
  };

  const handleDelete = (id) =>
    setItems((prev) => prev.filter((k) => k.id !== id));

  return (
    <div
      className="page-shell"
      style={{ background: light ? "#F8F7F3" : "#000000" }}
    >
      {processing && (
        <ProcessingModal
          stages={docStages}
          stage={stage}
          onClose={() => setProcessing(false)}
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
              onChange={triggerProcess}
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
            onAdd={() =>
              setItems((prev) => [
                ...prev,
                {
                  id: Date.now(),
                  title: "New YouTube Video",
                  type: "YouTube",
                  meta: "—",
                  status: "READY",
                  topics: 5,
                },
              ])
            }
          />
        </div>

        <section className="animate-fade-in-up delay-200">
          <div className="mb-4 flex items-center justify-between">
            <p className="section-label">
              Knowledge library · {items.length} sources
            </p>
          </div>
          <div className="space-y-3">
            {items.map((knowledgeItem) => (
              <div
                key={knowledgeItem.id}
                className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-3 sm:min-w-[180px]">
                  <FileTypeIcon type={knowledgeItem.type} />
                  <div>
                    <p className="text-base text-[var(--text-primary)]">
                      {knowledgeItem.title}
                    </p>
                    <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                      {knowledgeItem.meta}
                    </p>
                  </div>
                </div>

                <div className="flex-1">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {knowledgeItem.topics} topics detected
                  </p>
                </div>

                <div className="flex items-center gap-3 sm:justify-end">
                  <span className={`status-pill ready`}>
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
                      className="text-sm text-[var(--text-secondary)]"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function KnowledgeDetail({ theme }) {
  const navigate = useNavigate();
  const light = theme === "light";
  const topics = [
    "Normalization",
    "Functional Dependencies",
    "1NF / 2NF / 3NF",
    "BCNF",
    "Indexing",
    "Transactions",
    "SQL Joins",
    "Query Optimization",
  ];

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
                <span
                  className="source-pill"
                  style={{ color: "#E74C3C", borderColor: "#E74C3C66" }}
                >
                  PDF
                </span>
                <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  42 pages · 14 topics detected
                </span>
              </div>
              <h1 className="mt-4 font-display text-4xl text-[var(--text-primary)]">
                DBMS Notes
              </h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Database management systems — complete study material
              </p>
            </div>
            <KnowledgeSignal size={60} animated light={light} />
          </div>

          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5">
            <p className="section-label">Knowledge coverage</p>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { value: "14", label: "Topics" },
                { value: "1,240", label: "Chunks" },
                { value: "42", label: "Pages" },
                { value: "93%", label: "Coverage" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
                >
                  <p className="font-display text-2xl text-[var(--text-primary)]">
                    {stat.value}
                  </p>
                  <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <p className="section-label">Detected topics</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <span key={topic} className="source-pill">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/create" className="btn btn-primary flex-1">
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
