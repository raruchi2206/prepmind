import { useState, useRef, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { KnowledgeSignal } from "../components/KnowledgeSignal";
import { MarkdownRenderer } from "../components/MarkdownRenderer";
import { ragApi, knowledgeApi } from "../services/api";

function Message({
  role,
  text,
  sources,
  light,
  insufficientContext,
  generationTimeSeconds,
  isError,
  onRetry,
  onFollowUp,
}) {
  const border = light
    ? "border-[rgba(65,45,21,0.1)]"
    : "border-[rgba(225,220,201,0.08)]";
  const sub = light
    ? "text-[rgba(0,0,0,0.4)]"
    : "text-[rgba(225,220,201,0.4)]";

  if (role === "user") {
    return (
      <div className="flex justify-end mb-4 animate-fade-in-up">
        <div
          className={`max-w-xl px-4 py-3 rounded-2xl border text-sm font-body shadow-sm ${border}`}
          style={{
            background: light ? "#E1DCC9" : "#1F150C",
            color: light ? "#1F150C" : "#F6F1EA",
          }}
        >
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-6 animate-fade-in-up">
      <div className="flex-shrink-0 mt-1">
        <KnowledgeSignal size={26} animated light={light} />
      </div>
      <div className="flex-1 max-w-2xl">
        <div className="flex items-center justify-between mb-2">
          <p className={`font-mono text-[9px] tracking-widest uppercase ${sub}`}>
            {insufficientContext
              ? "PREPMIND RAG · INSUFFICIENT CONTEXT"
              : isError
              ? "PREPMIND RAG · ERROR"
              : "PREPMIND RAG ASSISTANT"}
          </p>
          <div className="flex items-center gap-2">
            {generationTimeSeconds && (
              <span className="font-mono text-[9px] text-[var(--text-secondary)] opacity-70">
                ⏱ {generationTimeSeconds}s
              </span>
            )}
            {isError && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 cursor-pointer"
              >
                ↻ Retry
              </button>
            )}
          </div>
        </div>

        <div
          className={`p-5 border rounded-2xl mb-3 shadow-sm ${border} ${
            insufficientContext
              ? "border-amber-500/40 bg-amber-500/5"
              : isError
              ? "border-red-500/40 bg-red-500/5"
              : ""
          }`}
          style={{
            background: insufficientContext
              ? undefined
              : isError
              ? undefined
              : light
              ? "#ffffff"
              : "#0A0703",
          }}
        >
          <MarkdownRenderer content={text} />
        </div>

        {insufficientContext && (
          <div className="mb-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300">
            💡 The selected knowledge sources do not have enough specific content to fully answer this query. Try choosing <strong>"All Uploaded Knowledge Sources"</strong> or uploading additional course materials on the <Link to="/knowledge" className="underline font-semibold">Knowledge Page</Link>.
          </div>
        )}

        {sources && sources.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center text-[10px] font-mono mt-2">
            <span className={sub}>Grounded in:</span>
            {sources.map((s, idx) => (
              <span
                key={idx}
                className={`px-2.5 py-1 rounded-md border ${border} bg-[var(--surface-elevated)] text-[var(--text-secondary)] flex items-center gap-1.5`}
                title={s.preview || s.text || s.title}
              >
                <span>📄</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {s.label || s.title}
                </span>
                {s.page && <span className="opacity-60">(p. {s.page})</span>}
                {s.timestamp && (
                  <span className="text-[var(--accent)]">⏱ {s.timestamp}</span>
                )}
              </span>
            ))}
          </div>
        )}

        {!isError && onFollowUp && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {[
              "Can you give a concrete example?",
              "What are the common pitfalls?",
              "Test me with a quick question on this.",
            ].map((fu, fIdx) => (
              <button
                key={fIdx}
                type="button"
                onClick={() => onFollowUp(fu)}
                className="text-[10px] font-body px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] text-[var(--text-secondary)] transition-all cursor-pointer"
              >
                + {fu}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Ask({ theme }) {
  const [searchParams] = useSearchParams();
  const initialKs = searchParams.get("knowledge");

  const [sources, setSources] = useState([]);
  const [selectedKsIds, setSelectedKsIds] = useState(
    initialKs ? [initialKs] : []
  );
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortControllerRef = useRef(null);
  const endRef = useRef(null);

  const light = theme === "light";
  const border = light
    ? "border-[rgba(65,45,21,0.1)]"
    : "border-[rgba(225,220,201,0.08)]";
  const sub = light
    ? "text-[rgba(0,0,0,0.4)]"
    : "text-[rgba(225,220,201,0.4)]";

  useEffect(() => {
    async function loadSources() {
      try {
        const res = await knowledgeApi.getAll();
        const list = res?.data?.knowledgeSources || [];
        setSources(list);
        if (list.length > 0 && selectedKsIds.length === 0 && !initialKs) {
          setSelectedKsIds([list[0].id]);
        }
      } catch (err) {
        console.warn("Could not fetch knowledge sources:", err.message);
      }
    }
    loadSources();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  };

  const handleNewChat = () => {
    handleStop();
    setConversationId(null);
    setMessages([]);
    setInput("");
    setError("");
  };

  const handleSend = async (textToSend = input) => {
    const q = (textToSend || "").trim();
    if (!q || loading) return;

    const userMsg = { role: "user", text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 90000);

    const startTime = Date.now();
    try {
      const res = await ragApi.ask(
        {
          query: q,
          knowledgeSourceIds: selectedKsIds.length > 0 ? selectedKsIds : null,
          conversationId: conversationId || undefined,
        },
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const data = res?.data || {};
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer || "No response generated.",
          sources: data.sources || [],
          insufficientContext: Boolean(data.insufficientContext),
          generationTimeSeconds: duration,
          isError: false,
        },
      ]);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "*Generation was cancelled by user.*",
            sources: [],
            insufficientContext: false,
            isError: false,
          },
        ]);
      } else {
        setError(err.message || "Failed to generate AI response.");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: `⚠️ **Unable to retrieve knowledge answer:** ${err.message || "Request failed"}.`,
            sources: [],
            insufficientContext: false,
            isError: true,
            failedQuery: q,
          },
        ]);
      }
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div
      className="min-h-screen pt-14 flex flex-col page-shell"
      style={{ background: light ? "#F8F7F3" : "#000" }}
    >
      {/* Header & Source Filter */}
      <div
        className="px-6 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 sticky top-14 z-10 backdrop-blur-md"
        style={{
          borderColor: light
            ? "rgba(65,45,21,0.1)"
            : "rgba(225,220,201,0.08)",
          background: light ? "rgba(248,247,243,0.92)" : "rgba(0,0,0,0.92)",
        }}
      >
        <div className="flex items-center gap-3">
          <KnowledgeSignal size={22} animated light={light} />
          <div>
            <p className="font-display text-sm font-medium tracking-wide text-[var(--text-primary)]">
              ASK PREPMIND
            </p>
            <p className={`text-[9px] font-mono ${sub}`}>
              Conversational RAG Grounded Assistant
            </p>
          </div>
        </div>

        {/* Source Selector & New Chat Button */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-mono ${sub}`}>Grounded Source:</span>
            {sources.length === 0 ? (
              <Link
                to="/knowledge"
                className="text-[10px] font-mono text-amber-500 hover:underline"
              >
                + Upload Knowledge First
              </Link>
            ) : (
              <select
                id="ask-source-select"
                value={selectedKsIds[0] || ""}
                onChange={(e) =>
                  setSelectedKsIds(e.target.value ? [e.target.value] : [])
                }
                className={`text-xs px-3 py-1.5 rounded-lg border bg-[var(--surface-elevated)] text-[var(--text-primary)] font-body focus:ring-1 focus:ring-[var(--ring)] ${border}`}
              >
                <option value="">All Uploaded Knowledge Sources</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.type})
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            id="new-chat-btn"
            type="button"
            onClick={handleNewChat}
            className="btn btn-secondary btn-sm text-xs font-mono py-1 px-3 flex items-center gap-1 cursor-pointer"
            title="Start a new conversation thread"
          >
            <span>+</span>
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto">
          {isEmpty && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-center animate-fade-in-up">
              <KnowledgeSignal size={70} animated light={light} />
              <div className="max-w-md">
                <h2 className="font-display text-3xl font-light mb-3 text-[var(--text-primary)]">
                  Ask about your knowledge
                </h2>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Ask questions, request deep explanations, compare concepts, or clarify formulas. PrepMind retrieves relevant chunks and answers exclusively from your documents.
                </p>
              </div>

              {sources.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center max-w-lg mt-2">
                  {[
                    "What are the main concepts in this source?",
                    "Summarize key definitions and formulas.",
                    "Explain the core mechanisms step by step.",
                    "What are the critical revision takeaways?",
                  ].map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(p)}
                      className={`text-[11px] font-body px-4 py-2 border rounded-xl transition-all ${border} bg-[var(--surface)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)] cursor-pointer`}
                    >
                      {p} →
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <Message
              key={i}
              {...msg}
              light={light}
              onRetry={msg.failedQuery ? () => handleSend(msg.failedQuery) : null}
              onFollowUp={(q) => handleSend(q)}
            />
          ))}

          {loading && (
            <div className="flex gap-3 mb-6 animate-fade-in-up">
              <KnowledgeSignal size={26} animated light={light} />
              <div
                className={`p-4 border rounded-2xl flex items-center justify-between gap-4 ${border}`}
                style={{ background: light ? "#fff" : "#0A0703" }}
              >
                <div className="flex gap-1.5 items-center">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{
                        background: light ? "#412D15" : "#E1DCC9",
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                  <span className="text-xs ml-2 text-[var(--text-secondary)] font-mono">
                    Searching FAISS & generating grounded answer...
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStop}
                  className="px-2.5 py-1 text-[10px] font-mono rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 cursor-pointer"
                >
                  ■ Stop
                </button>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 flex items-center justify-between">
              <span>{error}</span>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Input Form */}
      <div
        className="px-6 py-4 border-t sticky bottom-0 z-10 backdrop-blur-md"
        style={{
          borderColor: light
            ? "rgba(65,45,21,0.1)"
            : "rgba(225,220,201,0.08)",
          background: light ? "rgba(248,247,243,0.95)" : "rgba(0,0,0,0.95)",
        }}
      >
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-3"
          >
            <input
              id="ask-query-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your uploaded documents or videos..."
              disabled={loading}
              className={`flex-1 bg-[var(--surface-elevated)] border rounded-xl px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)] transition-all ${border}`}
            />
            {loading ? (
              <button
                type="button"
                onClick={handleStop}
                className="btn btn-secondary px-5 py-3 text-xs font-mono text-red-400 border-red-500/30 cursor-pointer"
              >
                ■ Stop
              </button>
            ) : (
              <button
                id="ask-submit-btn"
                type="submit"
                disabled={!input.trim()}
                className="btn btn-primary px-6 py-3 text-xs font-mono whitespace-nowrap cursor-pointer disabled:opacity-30"
              >
                Ask →
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
