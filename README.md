# Language Learning App with Ollama/Gemma

Private language learning app with local LLM. Ollama + Gemma, fully local, completely free.

## Features

- **Fast Pipeline**: Generate meanings, nuances, examples in multiple languages from a word
- **Semantic Search**: Vector embedding-based meaning search
- **Reasoning Answer**: Q&A in language learning context
- **Local Inference**: No cloud API needed, fully offline
- **Pronunciation Analysis**: Record speech, compare local MFCC features with a reference recording, transcribe with Whisper, and receive Gemma coaching

## Quick Start

### Prerequisites
- Node.js 20+, npm 10+
- PostgreSQL 15+ (with pgvector extension)

### Setup (3 Steps)

```bash
# 1. Complete setup (Ollama + npm + DB + models)
npm run setup:ollama

# 2. Or setup individually
npm install                                                           # Install dependencies
psql "postgres://postgres:postgres@localhost:5432/language_learning" -f server/migrations/001_language_learning_init.sql  # Setup DB
```

### Run

```bash
npm run dev:env          # Full startup (server + frontend)
# Or individually:
npm run server:dev       # Terminal 1: API server
npm run react:start      # Terminal 2: Frontend dev server
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

## Documentation

### English Documentation
- [SETUP.md](SETUP.md) - Detailed setup guide for all platforms
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design and project structure
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development guide and tips
- [DEPLOYMENT.md](DEPLOYMENT.md) - Building and deployment guides

### 日本語ドキュメント
- [docs_jp/SETUP_JP.md](docs_jp/SETUP_JP.md) - 詳細セットアップガイド
- [docs_jp/TROUBLESHOOTING_JP.md](docs_jp/TROUBLESHOOTING_JP.md) - よくある問題と解決法
- [docs_jp/ARCHITECTURE_JP.md](docs_jp/ARCHITECTURE_JP.md) - システム設計
- [docs_jp/DEVELOPMENT_JP.md](docs_jp/DEVELOPMENT_JP.md) - 開発ガイド
- [docs_jp/DEPLOYMENT_JP.md](docs_jp/DEPLOYMENT_JP.md) - ビルド・デプロイメント

### 日本語版 README
- [README_JP.md](README_JP.md) - 日本語による概要説明

## Tech Stack

- **Frontend**: React + Vite (Web, iOS, Android via Capacitor, Desktop via Electron)
- **Backend**: Express.js + PostgreSQL with pgvector
- **Local AI**: Ollama + Gemma3 4B (generation), embedding-gemma (embeddings), Whisper (transcription)

## Free & Open Source

- Ollama: completely free, open source
- Gemma: Google's open source, completely free
- All local processing (zero cloud costs)

## License

MIT License
