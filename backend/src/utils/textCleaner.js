/**
 * Cleans extracted text content while preserving casing, punctuation,
 * paragraph boundaries, technical symbols, and numbers.
 */
function cleanText(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return "";
  }

  return (
    rawText
      // Normalize line endings
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // Replace non-breaking spaces and zero-width characters
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]/g, " ")
      .replace(/[\u200B-\u200D]/g, "")
      // Remove control characters except standard whitespace (\n, \t)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Collapse multiple horizontal tabs/spaces on each line
      .replace(/[ \t]+/g, " ")
      // Trim each line
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      // Collapse excessive blank lines to maximum of 2 newlines (paragraph boundary)
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

module.exports = { cleanText };
