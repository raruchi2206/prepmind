const env = require("../config/env");
const { Agent } = require("undici");
const { createHttpError } = require("../middleware/errorMiddleware");

const QUIZ_RESPONSE_TIMEOUT_MS = 20 * 60 * 1000;
const TRANSCRIPT_TIMEOUT_MS = parseInt(process.env.YOUTUBE_TRANSCRIPT_TIMEOUT_MS || "90000", 10);

class AIServiceClient {
  constructor() {
    this.baseUrl = (
      process.env.AI_SERVICE_URL ||
      env.AI_SERVICE_URL ||
      "http://127.0.0.1:8000"
    ).replace(/\/$/, "");
    this.quizDispatcher = new Agent({
      headersTimeout: QUIZ_RESPONSE_TIMEOUT_MS,
      bodyTimeout: QUIZ_RESPONSE_TIMEOUT_MS,
    });
  }

  formatConnectionError(error, context = "AI service") {
    const rawMessage = error && (error.message || String(error));
    const transport = (error && error.cause && error.cause.code) || rawMessage;

    if (typeof transport === "string") {
      if (transport.includes("ECONNREFUSED")) {
        return `${context} is unavailable at ${this.baseUrl}. Reason: connection refused.`;
      }
      if (transport.includes("timeout") || transport.includes("timed out")) {
        return `${context} is unavailable at ${this.baseUrl}. Reason: request timeout.`;
      }
      if (transport.includes("ENOTFOUND") || transport.includes("EAI_AGAIN")) {
        return `${context} is unavailable at ${this.baseUrl}. Reason: DNS or network lookup failed.`;
      }
      if (transport.includes("fetch failed")) {
        return `${context} is unavailable at ${this.baseUrl}. Reason: network request failed.`;
      }
      return `${context} is unavailable at ${this.baseUrl}. Reason: ${transport}.`;
    }

    return `${context} is unavailable at ${this.baseUrl}.`;
  }

  async extractPdf(filePath) {
    const res = await fetch(`${this.baseUrl}/extract-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI Service /extract-pdf failed (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  async extractImage(filePath) {
    const res = await fetch(`${this.baseUrl}/extract-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath }),
    });

    if (!res.ok) {
      const errText = await res.text();
      let detail = errText;
      try {
        detail = JSON.parse(errText).detail || errText;
      } catch {}
      throw new Error(`AI Service /extract-image failed (${res.status}): ${detail}`);
    }

    return await res.json();
  }

  async fetchYouTubeTranscript(videoId, languages = []) {
    let res;
    try {
      res = await fetch(`${this.baseUrl}/youtube/transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, languages }),
        signal: AbortSignal.timeout(TRANSCRIPT_TIMEOUT_MS),
      });
    } catch (error) {
      const reason =
        error && error.name === "TimeoutError"
          ? "Transcript provider timed out. Please try again."
          : this.formatConnectionError(error, "Transcript provider (AI service)");
      throw createHttpError(503, reason, "TRANSCRIPT_PROVIDER_UNAVAILABLE");
    }

    if (!res.ok) {
      let detail = null;
      try {
        detail = (await res.json()).detail;
      } catch {}
      const code = (detail && detail.code) || "TRANSCRIPT_PROVIDER_UNAVAILABLE";
      const message =
        (detail && detail.message) ||
        (typeof detail === "string" ? detail : `Transcript provider failed (${res.status}).`);
      throw createHttpError(res.status >= 500 ? 503 : 422, message, code);
    }

    const data = await res.json();
    return data.data;
  }

  async checkHealth() {
    const endpoint = `${this.baseUrl}/health`;
    console.log(`[AI SERVICE] URL: ${this.baseUrl}`);
    console.log(`[AI SERVICE] Endpoint: /health`);
    console.log(`[AI SERVICE] Request started`);
    try {
      const res = await fetch(endpoint);
      console.log(`[AI SERVICE] Response status: ${res.status}`);
      if (!res.ok) {
        const errorText = await res.text();
        console.log(`[AI SERVICE] Response body: ${errorText}`);
        return { available: false, error: `Status ${res.status}: ${errorText}` };
      }

      const payload = await res.json();
      console.log(`[AI SERVICE] Response body: ${JSON.stringify(payload)}`);
      const ollamaInfo = payload?.ollama || {};
      const llmName = ollamaInfo.active_llm || "unknown";
      const embeddingName = ollamaInfo.active_embedding || "unknown";
      const health = {
        ...payload,
        available: payload?.status === "ok" || Boolean(ollamaInfo.available),
      };
      console.log(`[AI SERVICE] Health check: PASS`);
      console.log(
        `[AI SERVICE] Ollama: ${ollamaInfo.available ? "PASS" : "FAIL"}`,
      );
      console.log(`[AI SERVICE] LLM: ${llmName}`);
      console.log(`[AI SERVICE] Embedding: ${embeddingName}`);
      return health;
    } catch (err) {
      console.log(`[AI SERVICE] Error message: ${err && err.message ? err.message : String(err)}`);
      const message = this.formatConnectionError(err, "AI service");
      return {
        available: false,
        error: message,
      };
    }
  }

  async indexChunks(userId, knowledgeSourceId, chunks) {
    const payload = {
      userId: userId.toString(),
      knowledgeSourceId: knowledgeSourceId.toString(),
      chunks: chunks.map((c) => ({
        id: (c.id || c._id).toString(),
        text: c.text,
        chunkIndex: c.chunkIndex,
        metadata: c.metadata || {},
      })),
    };

    const res = await fetch(`${this.baseUrl}/index`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI Service /index failed (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  async getUserStats(userId) {
    try {
      const res = await fetch(
        `${this.baseUrl}/user-stats/${userId.toString()}`,
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.data || null;
    } catch {
      return null;
    }
  }

  async searchVectors(
    userId,
    query,
    knowledgeSourceIds = null,
    topK = 5,
    minSimilarity = null,
  ) {
    const payload = {
      userId: userId.toString(),
      query,
      knowledgeSourceIds: knowledgeSourceIds
        ? knowledgeSourceIds.map((id) => id.toString())
        : null,
      topK,
      minSimilarity,
    };

    const res = await fetch(`${this.baseUrl}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI Service /search failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.matches || [];
  }

  async deleteSourceVectors(userId, knowledgeSourceId) {
    try {
      const res = await fetch(`${this.baseUrl}/delete-source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId.toString(),
          knowledgeSourceId: knowledgeSourceId.toString(),
        }),
      });
      if (!res.ok) return { success: false };
      return await res.json();
    } catch (err) {
      console.error(
        `[AI Client] Error deleting source vectors: ${err.message}`,
      );
      return { success: false };
    }
  }

  async askRAG(query, chunks, conversationHistory = []) {
    const res = await fetch(`${this.baseUrl}/rag/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, chunks, conversationHistory }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI Service /rag/ask failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.data;
  }

  async generateSummary(chunks, title) {
    const res = await fetch(`${this.baseUrl}/rag/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chunks, title }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `AI Service /rag/summary failed (${res.status}): ${errText}`,
      );
    }

    const data = await res.json();
    return data.data;
  }

  async generateNotes(chunks, title) {
    const res = await fetch(`${this.baseUrl}/rag/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chunks, title }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `AI Service /rag/notes failed (${res.status}): ${errText}`,
      );
    }

    const data = await res.json();
    return data.data;
  }

  async generateQuiz(
    chunks,
    title,
    questionCount = 5,
    difficulty = "Medium",
    questionType = "MCQ",
    generationId = null,
    previousQuestionTexts = [],
    retry = false,
  ) {
    const endpoint = `${this.baseUrl}/rag/quiz`;
    console.log(`[AI SERVICE] URL: ${this.baseUrl}`);
    console.log(`[AI SERVICE] Endpoint: /rag/quiz`);
    console.log(`[AI SERVICE] Request started`);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        dispatcher: this.quizDispatcher,
        body: JSON.stringify({
          chunks,
          title,
          questionCount,
          difficulty,
          questionType,
          generationId,
          previousQuestionTexts,
          retry,
        }),
      });

      console.log(`[AI SERVICE] Response status: ${res.status}`);
      if (!res.ok) {
        const errText = await res.text();
        console.log(`[AI SERVICE] Response body: ${errText}`);
        let detail = errText;
        try {
          detail = JSON.parse(errText).detail || errText;
        } catch {}
        throw new Error(String(detail));
      }

      const data = await res.json();
      console.log(
        `[AI SERVICE] Response body: questions=${data?.data?.questions?.length || 0}`,
      );
      return data.data;
    } catch (error) {
      console.log(
        `[AI SERVICE] Error message: ${error && error.message ? error.message : String(error)}`,
      );
      if (error instanceof Error && error.message) {
        const message = error.message;
        if (
          message.includes("ECONNREFUSED") ||
          message.includes("fetch failed") ||
          message.includes("timeout") ||
          message.includes("ENOTFOUND")
        ) {
          throw new Error(
            this.formatConnectionError(error, "AI generation service"),
          );
        }
      }
      throw error;
    }
  }

  async generatePracticePaper(
    chunks,
    title,
    totalMarks = 60,
    difficulty = "Medium",
  ) {
    const res = await fetch(`${this.baseUrl}/rag/practice-paper`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chunks, title, totalMarks, difficulty }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `AI Service /rag/practice-paper failed (${res.status}): ${errText}`,
      );
    }

    const data = await res.json();
    return data.data;
  }

  async generateViva(chunks, title, questionCount = 5, difficulty = "Medium") {
    const res = await fetch(`${this.baseUrl}/rag/viva`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chunks, title, questionCount, difficulty }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `AI Service /rag/viva failed (${res.status}): ${errText}`,
      );
    }

    const data = await res.json();
    return data.data;
  }

  async evaluateAnswer(
    question,
    expectedAnswer,
    userAnswer,
    rubric = null,
    maxMarks = 5,
  ) {
    const res = await fetch(`${this.baseUrl}/rag/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        expectedAnswer,
        userAnswer,
        rubric,
        maxMarks,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `AI Service /rag/evaluate failed (${res.status}): ${errText}`,
      );
    }

    const data = await res.json();
    return data.data;
  }
}

module.exports = new AIServiceClient();
