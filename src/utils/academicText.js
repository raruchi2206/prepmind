const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
const NUMBERED_HEADING = /^(\d+(?:\.\d+)*)\.?\s+(\S.*)$/;
const BULLET = /^(?:[-•*▪◦]|\d+\))\s+(.*)$/;

function stripInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|\s)\*(\S.*?\S|\S)\*(?=\s|$|[.,;:])/g, "$1$2")
    .replace(/`([^`]*)`/g, "$1")
    .replace(EMOJI, "")
    .trim();
}

/**
 * Parses LLM study text (numbered headings, markdown headings, bullets, paragraphs)
 * into render blocks. Never throws: unexpected input becomes paragraphs.
 *
 * Block shapes: { type: "heading" | "subheading" | "paragraph", text } and
 * { type: "list", items: string[] }.
 */
export function parseAcademicText(raw) {
  if (raw === null || raw === undefined) return [];
  const source = typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);

  const blocks = [];
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list && list.items.length > 0) blocks.push(list);
    list = null;
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  for (const rawLine of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line || /^[-=_*]{3,}$/.test(line)) {
      flushAll();
      continue;
    }

    const markdownHeading = line.match(/^(#{1,6})\s+(.*)$/);
    if (markdownHeading) {
      flushAll();
      const text = stripInline(markdownHeading[2]);
      if (text) blocks.push({ type: markdownHeading[1].length <= 2 ? "heading" : "subheading", text });
      continue;
    }

    const numbered = line.match(NUMBERED_HEADING);
    // Short numbered lines are section titles; long ones are numbered sentences
    if (numbered && numbered[2].length <= 90 && !/[.:]$/.test(numbered[2].trim())) {
      flushAll();
      blocks.push({
        type: numbered[1].includes(".") ? "subheading" : "heading",
        text: stripInline(`${numbered[1]}. ${numbered[2]}`.replace(/^(\d+(?:\.\d+)+)\.\s/, "$1 ")),
      });
      continue;
    }

    const bullet = line.match(BULLET);
    if (bullet) {
      flushParagraph();
      if (!list) list = { type: "list", items: [] };
      const item = stripInline(bullet[1]);
      if (item) list.items.push(item);
      continue;
    }

    // Indented continuation of the previous bullet
    if (list && /^\s{2,}/.test(rawLine) && list.items.length > 0) {
      list.items[list.items.length - 1] += ` ${stripInline(line)}`;
      continue;
    }

    flushList();
    const text = stripInline(line);
    if (text) paragraph.push(text);
  }
  flushAll();
  return blocks;
}
