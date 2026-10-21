import { useState, useRef, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { KnowledgeSignal } from "../components/KnowledgeSignal";
import { ragApi, knowledgeApi } from "../services/api";

function Message({ role, text, sources, light, insufficientContext, generationTimeSeconds }) {
  const border = light
    ? "border-[rgba(65,45,21,0.1)]"
    : "border-[rgba(225,220,201,0.08)]";
  const muted = light
    ? "text-[rgba(0,0,0,0.6)]"
    : "text-[rgba(225,220,201,0.6)]";
  const sub = light
    ? "text-[rgba(0,0,0,0.4)]"
    : "text-[rgba(225,220,201,0.4)]";

  if (role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div
          className={`max-w-xl px-4 py-3 rounded-xl border text-sm font-body ${border}`}
          style={{ background: light ? "#E1DCC9" : "#1F150C" }}
        >
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-6">
      <div className="flex-shrink-0 mt-1">
        <KnowledgeSignal size={24} animated light={light} />
      </div>
      <div className="flex-1 max-w-2xl">
        <div className="flex items-center justify-between mb-2">
          <p className={`font-mono text-[9px] tracking-widest ${sub}`}>
            {insufficientContext ? "PREPMIND RAG · INSUFFICIENT CONTEXT" : "PREPMIND RAG"}
          </p>
          {generationTimeSeconds && (
            <span className="font-mono text-[9px] text-[var(--text-secondary)] opacity-70">
              ⏱ {generationTimeSeconds}s
            </span>
          )}
        </div>
        <div
          className={`p-5 border rounded-xl mb-3 ${border} ${
            insufficientContext ? "border-amber-500/40 bg-amber-500/5" : ""
          }`}
          style={{ background: insufficientContext ? undefined : light ? "#fff" : "#0A0703" }}
        >
          <div className="text-sm font-body leading-relaxed whitespace-pre-wrap">
            {text}
          </div>
        </div>

        {sources && sources.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center text-[10px] font-mono mt-2">
            <span className={sub}>Grounding Sources:</span>
            {sources.map((s, idx) => (
              <span
                key={idx}
                className={`px-2.5 py-1 rounded-md border ${border} bg-[var(--surface-elevated)] text-[var(--text-secondary)]`}
              >
                📄 {s.label || s.title}
              </span>
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
        if (list.length > 0 && selectedKsIds.length === 0) {
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

  const handleSend = async (textToSend = input) => {
    const q = (textToSend || "").trim();
    if (!q || loading) return;

    const userMsg = { role: "user", text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError("");

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out after 90 seconds. Please try asking again.")), 90000)
    );

    const startTime = Date.now();
    try {
      const askPromise = ragApi.ask({
        query: q,
        knowledgeSourceIds: selectedKsIds.length > 0 ? selectedKsIds : null,
        conversationId: conversationId || undefined,
      });

      const res = await Promise.race([askPromise, timeoutPromise]);
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
        },
      ]);
    } catch (err) {
      setError(err.message || "Failed to generate AI response.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `⚠️ ${err.message || "Could not retrieve knowledge"}`,
          sources: [],
          insufficientContext: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div
      className="min-h-screen pt-14 flex flex-col"
      style={{ background: light ? "#F8F7F3" : "#000" }}
    >
      {/* Header & Source Filter */}
      <div
        className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3"
        style={{
          borderColor: light
            ? "rgba(65,45,21,0.1)"
            : "rgba(225,220,201,0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          <KnowledgeSignal size={20} animated light={light} />
          <div>
            <p className="font-display text-sm font-light">ASK PREPMIND</p>
            <p className={`text-[9px] font-mono ${sub}`}>
              RAG-Grounded AI Knowledge Retrieval
            </p>
          </div>
        </div>

        {/* Source Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-mono ${sub}`}>Source:</span>
          {sources.length === 0 ? (
            <Link
              to="/knowledge"
              className="text-[10px] font-mono text-amber-500 hover:underline"
            >
              + Upload Knowledge First
            </Link>
          ) : (
            <select
              value={selectedKsIds[0] || ""}
              onChange={(e) =>
                setSelectedKsIds(e.target.value ? [e.target.value] : [])
              }
              className={`text-xs px-2.5 py-1.5 rounded-lg border bg-[var(--surface-elevated)] text-[var(--text-primary)] ${border}`}
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
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto">
          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-80 gap-6">
              <KnowledgeSignal size={70} animated light={light} />
              <div className="text-center max-w-md">
                <p className="font-display text-2xl font-light mb-2">
                  Ask about your knowledge
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Ask questions, request explanations, or clarify concepts.
                  PrepMind answers exclusively from your uploaded documents with
                  verifiable citations.
                </p>
              </div>

              {sources.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {[
                    "What are the main concepts in this document?",
                    "Summarize the key definitions and formulas.",
                    "Explain the core mechanisms step by step.",
                  ].map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(p)}
                      className={`text-[11px] font-body px-3.5 py-2 border rounded-lg transition-all ${border} bg-[var(--surface)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)]`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <Message key={i} {...msg} light={light} />
          ))}

          {loading && (
            <div className="flex gap-3 mb-6">
              <KnowledgeSignal size={24} animated light={light} />
              <div
                className={`p-4 border rounded-xl ${border}`}
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
                    Searching FAISS & generating answer...
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
              {error}
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Input Form */}
      <div
        className="px-6 py-4 border-t"
        style={{
          borderColor: light
            ? "rgba(65,45,21,0.1)"
            : "rgba(225,220,201,0.08)",
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your uploaded documents..."
              className={`flex-1 bg-[var(--surface-elevated)] border rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)] transition-all ${border}`}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="btn btn-primary px-6 py-3 text-xs whitespace-nowrap"
            >
              {loading ? "Searching..." : "Ask →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
