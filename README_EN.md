# Language Learning App with Ollama/Gemma

Private language learning app with local LLM. Ollama + Gemma, fully local, completely free.

## Features

- **Fast Pipeline**: Generate meanings, nuances, examples in multiple languages from a word
- **Semantic Search**: Vector embedding-based meaning search
- **Reasoning Answer**: Q&A in language learning context
- **Local Inference**: No cloud API needed, fully offline
- **Pronunciation Analysis**: Record speech, compare local MFCC features with a reference recording, transcribe with Whisper, and receive Gemma coaching

## Setup (3 Steps)

### Prerequisites
- Node.js 20+, npm 10+
- PostgreSQL 15+ (with pgvector extension)

### Install

```bash
# 1. Ollama setup (first time only, same command for all OS)
npm run setup:ollama

# 2. Install npm dependencies
npm install

# 3. DB setup
psql "postgres://postgres:postgres@localhost:5432/language_learning" -f server/migrations/001_language_learning_init.sql
```

### Run

**Windows / Linux / macOS (same):**
```bash
npm run dev:env
```

Or individually:
```bash
npm run server:dev    # Terminal 1: API server
npm run react:start   # Terminal 2: Frontend dev server
npm run dev           # Or Electron app
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | - (required) |
| `OLLAMA_BASE_URL` | Ollama API URL | `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Generation model | `gemma3:4b` |
| `OLLAMA_EMBEDDING_MODEL` | Embedding model | `embeddinggemma` |
| `WHISPER_MODEL` | Local Whisper transcription model | `Xenova/whisper-tiny` |

## npm Scripts

```bash
npm run setup:ollama      # Ollama + model setup
npm run dev:env          # Full startup (Ollama + server + frontend)
npm run dev              # Electron app development
npm run server:dev       # API server only
npm run react:start      # Frontend dev server only
npm run react:build      # Frontend production build
npm run server:test      # Run tests
npm run dist:win         # Windows build
```

## Troubleshooting

**Cannot connect to Ollama**
- Check if Ollama is running: `ollama serve`
- Verify models: `ollama list`
- Check `OLLAMA_BASE_URL` setting

**pgvector extension not found**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Whisper is downloading on the first transcription**
- This is expected. The model is cached locally after the first download.
- Keep the API server running until the first transcription completes.

## Free & Open Source

- Ollama: completely free, open source
- Gemma: Google's open source, completely free
- All local processing (zero cloud costs)

## License

MIT License
