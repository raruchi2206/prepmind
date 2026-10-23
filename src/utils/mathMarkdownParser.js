import { marked } from "marked";
import katex from "katex";
import DOMPurify from "dompurify";

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * Normalizes escaped LaTeX delimiters from LLM responses:
 * - \\[ ... \\] and \[ ... \] -> $$ ... $$
 * - \\( ... \\) and \( ... \) -> $ ... $
 */
function normalizeDelimiters(text) {
  if (!text) return "";
  let s = String(text);

  // Normalize multi-escaped brackets
  s = s.replace(/\\\\\[/g, "\n\n$$\n").replace(/\\\\\]/g, "\n$$\n\n");
  s = s.replace(/\\\[/g, "\n\n$$\n").replace(/\\\]/g, "\n$$\n\n");
  s = s.replace(/\\\\\(/g, "$").replace(/\\\\\)/g, "$");
  s = s.replace(/\\\(/g, "$").replace(/\\\)/g, "$");

  return s;
}

/**
 * Parses markdown text containing math expressions, timestamps, and formatting
 * into safe, sanitized HTML.
 */
export function renderMarkdownAndMath(rawText) {
  if (rawText === null || rawText === undefined) return "";
  const source = typeof rawText === "string" ? rawText : JSON.stringify(rawText, null, 2);
  if (!source.trim()) return "";

  // 1. First protect existing fenced code blocks
  const codeBlocks = [];
  let text = source.replace(/```([\s\S]*?)```/g, (match) => {
    const placeholder = `%%CODEBLOCK_${codeBlocks.length}%%`;
    codeBlocks.push(match);
    return placeholder;
  });

  // 2. Protect inline code
  const inlineCodes = [];
  text = text.replace(/`([^`\n]+?)`/g, (match) => {
    const placeholder = `%%INLINECODE_${inlineCodes.length}%%`;
    inlineCodes.push(match);
    return placeholder;
  });

  // 3. Normalize LaTeX delimiters outside of code
  text = normalizeDelimiters(text);

  // 4. Extract Block Math ($$...$$)
  const mathBlocks = [];
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
    const trimmed = formula.trim();
    if (!trimmed) return "";
    const placeholder = `\n\n%%MATHBLOCK_${mathBlocks.length}%%\n\n`;
    mathBlocks.push(trimmed);
    return placeholder;
  });

  // 5. Extract Inline Math ($...$)
  // Match $...$ where opening and closing $ are not preceded/followed by space
  const mathInlines = [];
  text = text.replace(/(^|[^\\$])\$([^\$\n]+?)\$(?!\$)/g, (match, prefix, formula) => {
    const trimmed = formula.trim();
    // Ignore currency like $10 or $100
    if (/^\d+(?:,\d+)*(?:\.\d+)?$/.test(trimmed)) {
      return match;
    }
    const placeholder = `%%MATHINLINE_${mathInlines.length}%%`;
    mathInlines.push(trimmed);
    return prefix + placeholder;
  });

  // 6. Restore code blocks and inline code before markdown parsing
  text = text.replace(/%%INLINECODE_(\d+)%%/g, (match, idx) => inlineCodes[Number(idx)] || "");
  text = text.replace(/%%CODEBLOCK_(\d+)%%/g, (match, idx) => codeBlocks[Number(idx)] || "");

  // 7. Parse Markdown to HTML
  let html = marked.parse(text);

  // 8. Restore Block Math with KaTeX
  html = html.replace(/(?:<p>)?%%MATHBLOCK_(\d+)%%(?:<\/p>)?/g, (match, idx) => {
    const formula = mathBlocks[Number(idx)] || "";
    try {
      const rendered = katex.renderToString(formula, {
        displayMode: true,
        throwOnError: false,
      });
      return `<div class="katex-display-container my-4 overflow-x-auto py-2 text-center">${rendered}</div>`;
    } catch {
      return `<div class="katex-fallback font-mono p-2 my-2 bg-[var(--surface-elevated)] rounded border border-[var(--border)] overflow-x-auto">${escapeHtml(formula)}</div>`;
    }
  });

  // 9. Restore Inline Math with KaTeX
  html = html.replace(/%%MATHINLINE_(\d+)%%/g, (match, idx) => {
    const formula = mathInlines[Number(idx)] || "";
    try {
      const rendered = katex.renderToString(formula, {
        displayMode: false,
        throwOnError: false,
      });
      return `<span class="katex-inline-container inline-block px-1 align-baseline">${rendered}</span>`;
    } catch {
      return `<code class="font-mono text-xs px-1 py-0.5 rounded bg-[var(--surface-elevated)]">${escapeHtml(formula)}</code>`;
    }
  });

  // 10. Highlight YouTube timestamps [MM:SS] or [HH:MM:SS] or ranges
  html = html.replace(/\[(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[-–]\s*\d{1,2}:\d{2}(?::\d{2})?)?)\]/g, (match, ts) => {
    return `<span class="timestamp-pill inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-full font-mono text-[0.72rem] tracking-tight bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--accent)] select-none">⏱ ${ts}</span>`;
  });

  // 11. Sanitize HTML with DOMPurify while preserving KaTeX elements
  const cleanHtml = DOMPurify.sanitize(html, {
    ADD_TAGS: [
      "annotation",
      "semantics",
      "math",
      "mrow",
      "mi",
      "mn",
      "mo",
      "msup",
      "msub",
      "mfrac",
      "mover",
      "munder",
      "msqrt",
      "mstyle",
      "mtable",
      "mtr",
      "mtd",
      "mtext",
      "mpadded",
      "mphantom",
      "mspace",
    ],
    ADD_ATTR: [
      "display",
      "xmlns",
      "viewBox",
      "aria-hidden",
      "focusable",
      "role",
      "target",
      "rel",
      "style",
      "class",
    ],
  });

  return cleanHtml;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
