import { Link } from "react-router-dom";
import { KnowledgeSignal } from "./KnowledgeSignal";

const footerColumns = [
  {
    title: "Workspace",
    links: [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Knowledge", path: "/knowledge" },
      { label: "History", path: "/history" },
      { label: "Progress", path: "/progress" },
    ],
  },
  {
    title: "Study tools",
    links: [
      { label: "Summary", path: "/summary" },
      { label: "Notes", path: "/notes" },
      { label: "Quiz", path: "/quiz" },
      { label: "Practice paper", path: "/practice-paper" },
      { label: "Viva", path: "/viva" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Ask PrepMind", path: "/ask" },
      { label: "Create", path: "/create" },
      { label: "Profile", path: "/profile" },
    ],
  },
];

export function Footer({ theme }) {
  const light = theme === "light";

  return (
    <footer
      className="border-t border-[var(--border)]"
      style={{ background: light ? "#F1EFE8" : "#0D0A08" }}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Link to="/dashboard" className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)]">
                <KnowledgeSignal size={18} light={light} animated />
              </span>
              <span className="font-display text-sm uppercase tracking-[0.18em] text-[var(--text-primary)]">
                PrepMind
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
              Turn your documents and videos into summaries, notes, quizzes, practice
              papers and viva practice.
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <p className="section-label">{column.title}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            © {new Date().getFullYear()} PrepMind. All rights reserved.
          </p>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            Turn your knowledge into intelligent preparation.
          </p>
        </div>
      </div>
    </footer>
  );
}
