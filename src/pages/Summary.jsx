import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { KnowledgeSignal } from "../components/KnowledgeSignal";

const genStages = [
  "READING KNOWLEDGE",
  "SELECTING RELEVANT CONTENT",
  "CREATING SUMMARY",
  "CHECKING",
  "SUMMARY READY",
];

const sampleSummary = {
  title: "Database Management Systems",
  overview:
    "DBMS is software that manages and organizes databases, allowing efficient storage, retrieval, and manipulation of structured data. This summary covers normalization theory, relational algebra, transaction management, and query optimization.",
  keyConcepts: [
    {
      term: "Normalization",
      def: "Process of organizing data to reduce redundancy and improve integrity by decomposing relations into smaller, well-structured tables.",
    },
    {
      term: "Functional Dependency",
      def: "A constraint where one attribute uniquely determines another. Written as X → Y, meaning X functionally determines Y.",
    },
    {
      term: "ACID Properties",
      def: "Atomicity, Consistency, Isolation, Durability — the four essential properties of reliable database transactions.",
    },
    {
      term: "Indexing",
      def: "Data structure technique that speeds up data retrieval operations by creating auxiliary access structures.",
    },
  ],
  importantPoints: [
    "3NF eliminates transitive dependencies; BCNF is stricter, eliminating all partial dependencies.",
    "A transaction is a logical unit of work that must be atomic — either all operations succeed or none do.",
    "B+ Trees are most commonly used for indexing in relational databases due to ordered traversal support.",
    "Join operations (INNER, LEFT, RIGHT, FULL OUTER) are fundamental for multi-table queries.",
  ],
  examFocus:
    "Focus on normal forms (1NF → BCNF), transaction isolation levels, and the difference between clustered and non-clustered indexes.",
  source: "DBMS Notes.pdf · DBMS YouTube Lecture",
};

function GeneratingScreen({ stage }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-8">
      <KnowledgeSignal size={100} animated />
      <div className="text-center">
        {genStages.map((step, index) => (
          <p
            key={step}
            className={`mt-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] transition-opacity duration-500 ${index === stage ? "opacity-100" : index < stage ? "opacity-30" : "opacity-15"}`}
          >
            {index < stage ? "✓ " : index === stage ? "→ " : "  "}
            {step}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function Summary({ theme }) {
  const [generating, setGenerating] = useState(true);
  const [stage, setStage] = useState(0);
  const [summaryType, setSummaryType] = useState("exam");
  const light = theme === "light";

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((s) => {
        if (s >= genStages.length - 1) {
          clearInterval(interval);
          setGenerating(false);
          return s;
        }
        return s + 1;
      });
    }, 700);
    return () => clearInterval(interval);
  }, []);

  if (generating) {
    return (
      <div
        className="page-shell"
        style={{ background: light ? "#F8F7F3" : "#000000" }}
      >
        <div className="page-inner flex min-h-[74vh] items-center justify-center">
          <GeneratingScreen stage={stage} />
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
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between animate-fade-in-up">
          <div>
            <p className="section-label">Summary</p>
            <h1 className="mt-4 font-display text-4xl text-[var(--text-primary)]">
              {sampleSummary.title}
            </h1>
            <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              {sampleSummary.source}
            </p>
          </div>
          <div className="flex gap-2">
            {["short", "detailed", "exam"].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSummaryType(option)}
                className="btn btn-sm"
                style={{
                  background:
                    summaryType === option ? "var(--accent)" : "transparent",
                  color:
                    summaryType === option
                      ? "var(--accent-foreground)"
                      : "var(--text-primary)",
                  borderColor: "var(--border)",
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section className="panel p-6 animate-fade-in-up delay-100">
            <p className="section-label">Overview</p>
            <p className="mt-4 text-lg leading-8 text-[var(--text-primary)]">
              {sampleSummary.overview}
            </p>
          </section>

          <section className="animate-fade-in-up delay-200">
            <p className="section-label">Key concepts</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {sampleSummary.keyConcepts.map((concept) => (
                <article key={concept.term} className="panel p-4">
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                    {concept.term}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                    {concept.def}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel p-6 animate-fade-in-up delay-300">
            <p className="section-label">Important points</p>
            <ul className="mt-4 space-y-3">
              {sampleSummary.importantPoints.map((point, index) => (
                <li
                  key={point}
                  className="flex gap-3 text-base leading-7 text-[var(--text-primary)]"
                >
                  <span className="inline-flex w-6 shrink-0 justify-center font-mono text-[0.6rem] text-[var(--text-secondary)]">
                    0{index + 1}
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="panel p-6 animate-fade-in-up delay-400"
            style={{
              background: light
                ? "rgba(65,45,21,0.04)"
                : "rgba(225,220,201,0.04)",
            }}
          >
            <p className="section-label">Exam focus</p>
            <p className="mt-4 text-base leading-8 text-[var(--text-primary)]">
              {sampleSummary.examFocus}
            </p>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 animate-fade-in-up delay-500">
          <Link to="/notes" className="btn btn-secondary">
            Create notes
          </Link>
          <Link to="/quiz" className="btn btn-secondary">
            Create quiz
          </Link>
          <Link to="/ask" className="btn btn-secondary">
            Ask PrepMind
          </Link>
          <button type="button" className="btn btn-primary">
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
