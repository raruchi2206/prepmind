# AI Provider Configuration

PrepMind's AI service (`ai-service/`) uses two separate engines:

| Job | Engine | Where it runs |
| --- | --- | --- |
| Text generation (summary, notes, quiz, practice paper, viva, Ask PrepMind, YouTube relevance check) | Groq chat completions, default model `openai/gpt-oss-120b` | Groq cloud API |
| Embeddings for retrieval | `sentence-transformers/all-MiniLM-L6-v2` via fastembed (ONNX, CPU) | In-process, no external service |
| Vector search | FAISS (inner product on L2-normalized 384-dim vectors) | In-process, per-user index under `ai-service/data/faiss` |

Ollama is optional. It is used for text generation only when `GROQ_API_KEY` is not set.

## Configuration (`ai-service/.env`)

```env
GROQ_API_KEY=your_groq_api_key_here      # never commit a real key
GROQ_MODEL=openai/gpt-oss-120b
GROQ_REASONING_EFFORT=low                # gpt-oss reasoning effort: low | medium | high
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_BATCH_SIZE=64
FAISS_BASE_PATH=./data/faiss
```

The embedding model (~90 MB) downloads once into `ai-service/data/models` and is loaded at startup.
`ai-service/.env` and `ai-service/data/` are gitignored.

## Behaviour

- JSON outputs (quiz, practice paper, viva) use Groq JSON mode.
- Requests are retried on HTTP 429 and 5xx with backoff, honouring `retry-after`.
- `GET /health` on the AI service reports the active provider, the Groq model, and whether the embedding model is loaded.
- The backend exposes the same information at `GET /api/ai/health`.

## Changing the embedding model

The FAISS index stores 384-dimensional vectors. Any replacement embedding model must also produce
384-dimensional vectors, or every source must be reprocessed after clearing `ai-service/data/faiss`.
