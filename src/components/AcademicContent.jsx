import { MarkdownRenderer } from "./MarkdownRenderer";

/**
 * Universal academic content renderer with full Markdown, KaTeX LaTeX math support,
 * timestamps, tables, and XSS sanitization.
 */
export function AcademicContent({ text, className = "" }) {
  return <MarkdownRenderer content={text} className={className} />;
}

export default AcademicContent;
