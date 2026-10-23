/**
 * Reusable estimation of remaining time for PrepMind generation tasks
 * (Summary, Notes, Quiz, Practice Paper, etc.).
 *
 * Dynamically accounts for:
 * 1. Groq high-speed cloud inference (~6-12s baseline)
 * 2. Automatic fallback to local Ollama execution (~45-75s baseline)
 * 3. Measurable elapsed time and task complexity
 * 4. Graceful handling of overruns without negative numbers or stuck counters
 */

export function getRemainingTimeEstimate({
  kind = "document",
  elapsedSeconds = 0,
  provider = "groq",
  itemCount = 5,
  isFallback = false,
}) {
  // If just started, do not fabricate an instant precision countdown
  if (elapsedSeconds < 2) {
    return {
      primary: "Estimating remaining time…",
      secondary: `⏱ Elapsed: ${elapsedSeconds}s`,
      isRecalculating: true,
      remainingSeconds: null,
    };
  }

  // Detect fallback transition: Groq usually finishes within 12 seconds.
  // If elapsed time passes 12s without completing, fallback is in progress.
  const usingOllama = isFallback || provider === "ollama" || elapsedSeconds > 12;

  let expectedDuration = 8;
  const normalizedKind = String(kind).toUpperCase();

  if (usingOllama) {
    switch (normalizedKind) {
      case "QUIZ":
        expectedDuration = 35 + Math.min(Number(itemCount) || 5, 10) * 4;
        break;
      case "NOTES":
        expectedDuration = 65;
        break;
      case "SUMMARY":
        expectedDuration = 45;
        break;
      case "PRACTICE_PAPER":
      case "PRACTICE PAPER":
        expectedDuration = 70;
        break;
      case "VIVA":
        expectedDuration = 50;
        break;
      default:
        expectedDuration = 50;
    }
  } else {
    switch (normalizedKind) {
      case "QUIZ":
        expectedDuration = 4 + Math.min(Number(itemCount) || 5, 10) * 0.7;
        break;
      case "NOTES":
        expectedDuration = 10;
        break;
      case "SUMMARY":
        expectedDuration = 8;
        break;
      case "PRACTICE_PAPER":
      case "PRACTICE PAPER":
        expectedDuration = 12;
        break;
      case "VIVA":
        expectedDuration = 9;
        break;
      default:
        expectedDuration = 8;
    }
  }

  const remaining = expectedDuration - elapsedSeconds;

  // If the operation is running longer than expected
  if (remaining <= 2) {
    if (elapsedSeconds > expectedDuration + 15) {
      return {
        primary: "Taking longer than expected — finalizing…",
        secondary: `⏱ Elapsed: ${elapsedSeconds}s${usingOllama ? " (local fallback)" : ""}`,
        isRecalculating: true,
        remainingSeconds: 2,
      };
    }
    return {
      primary: "Estimated time remaining: ~a few seconds",
      secondary: `⏱ Elapsed: ${elapsedSeconds}s${usingOllama ? " (local fallback)" : ""}`,
      isRecalculating: false,
      remainingSeconds: 3,
    };
  }

  const roundedSec = Math.round(remaining);
  let humanTime = "";

  if (roundedSec >= 90) {
    humanTime = `~${Math.round(roundedSec / 60)} minutes`;
  } else if (roundedSec >= 50) {
    humanTime = "~1 minute";
  } else {
    humanTime = `~${roundedSec} seconds`;
  }

  return {
    primary: `Estimated time remaining: ${humanTime}`,
    secondary: `⏱ Elapsed: ${elapsedSeconds}s${usingOllama ? " (local fallback)" : ""}`,
    isRecalculating: false,
    remainingSeconds: roundedSec,
  };
}

export default getRemainingTimeEstimate;
