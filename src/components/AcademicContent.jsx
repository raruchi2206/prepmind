import { useMemo } from "react";
import { parseAcademicText } from "../utils/academicText";

// Highlights [mm:ss] / [h:mm:ss] video references inside generated text
function withTimestamps(text) {
  const parts = String(text).split(/(\[\d{1,2}:\d{2}(?::\d{2})?(?:\s*[-–]\s*\d{1,2}:\d{2}(?::\d{2})?)?\])/g);
  return parts.map((part, i) =>
    /^\[\d/.test(part) ? (
      <span
        key={i}
        className="mx-0.5 rounded border border-[var(--border)] bg-[var(--surface-elevated)] px-1 font-mono text-[0.72rem] text-[var(--accent)]"
      >
        {part.slice(1, -1)}
      </span>
    ) : (
      part
    ),
  );
}

export function AcademicContent({ text }) {
  const blocks = useMemo(() => parseAcademicText(text), [text]);

  if (blocks.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">No content was returned.</p>;
  }

  return (
    <div className="space-y-4 text-sm leading-relaxed text-[var(--text-primary)]">
      {blocks.map((block, idx) => {
        if (block.type === "heading") {
          return (
            <h3
              key={idx}
              className="border-b border-[var(--border)] pb-1 pt-4 font-display text-xl font-medium text-[var(--text-primary)]"
            >
              {withTimestamps(block.text)}
            </h3>
          );
        }
        if (block.type === "subheading") {
          return (
            <h4 key={idx} className="pt-2 font-display text-base font-medium text-[var(--accent)]">
              {withTimestamps(block.text)}
            </h4>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={idx} className="list-disc space-y-1.5 pl-6">
              {block.items.map((item, i) => (
                <li key={i}>{withTimestamps(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="leading-relaxed">
            {withTimestamps(block.text)}
          </p>
        );
      })}
    </div>
  );
}
