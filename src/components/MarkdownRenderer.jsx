import { useMemo } from "react";
import { renderMarkdownAndMath } from "../utils/mathMarkdownParser";

/**
 * Reusable, secure Markdown and LaTeX math content renderer.
 * Safely renders headings, bold/italic, lists, tables, code blocks, blockquotes,
 * mathematical formulas via KaTeX ($...$, $$...$$, \\(...\\), \\[[...\\]),
 * and YouTube timestamp pills ([MM:SS]).
 */
export function MarkdownRenderer({ content, className = "", emptyText = "No content available." }) {
  const html = useMemo(() => {
    if (!content || (typeof content === "string" && !content.trim())) {
      return "";
    }
    return renderMarkdownAndMath(content);
  }, [content]);

  if (!html) {
    return (
      <div className={`text-sm text-[var(--text-secondary)] italic ${className}`}>
        {emptyText}
      </div>
    );
  }

  return (
    <div
      className={`markdown-body academic-markdown text-sm leading-relaxed text-[var(--text-primary)] ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default MarkdownRenderer;
