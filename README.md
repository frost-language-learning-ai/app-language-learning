# Language Learning App with Ollama/Gemma
[日本語版 README](./README_JP.md)

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

### Setup

```bash
npm install
```

Install and start Ollama from the application's **AI Setup** tab. The screen checks its status and downloads the required local AI models.

### Run

```bash
npm run dev              # Starts the frontend, Tauri, and the local API
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
npm run dev              # Tauri desktop development
npm run tauri:dev        # Tauri desktop only (API must be running)
npm run server:dev       # API server only
npm run react:start      # Frontend dev server only
npm run react:build      # Frontend production build
npm run server:test      # Run tests
npm run dist:win         # Tauri Windows installer build
```

## Documentation

### English Documentation
- [SETUP](doc/SETUP.md) - Detailed setup guide for all platforms
- [TROUBLESHOOTING](doc/TROUBLESHOOTING.md) - Common issues and solutions
- [ARCHITECTURE](doc/ARCHITECTURE.md) - System design and project structure
- [DEVELOPMENT](doc/DEVELOPMENT.md) - Development guide and tips
- [DEPLOYMENT](doc/DEPLOYMENT.md) - Building and deployment guides

### 日本語ドキュメント
- [セットアップガイド](doc_jp/SETUP_JP.md) - 詳細セットアップガイド
- [よくある問題と解決法](doc_jp/TROUBLESHOOTING_JP.md) - よくある問題と解決法
- [システム設計](doc_jp/ARCHITECTURE_JP.md) - システム設計
- [開発ガイド](doc_jp/DEVELOPMENT_JP.md) - 開発ガイド
- [ビルド・デプロイメント](doc_jp/DEPLOYMENT_JP.md) - ビルド・デプロイメント


## Tech Stack

- **Frontend**: React + Vite (Web, iOS, Android via Capacitor, Desktop via Tauri)
- **Backend**: Express.js + PostgreSQL with pgvector
- **Local AI**: Ollama + Gemma3 4B (generation), embedding-gemma (embeddings), Whisper (transcription)

## Free & Open Source

- Ollama: completely free, open source
- Gemma: Google's open source, completely free
- All local processing (zero cloud costs)

## **License**

Free for personal and commercial use.
However, you need to contact the author and developer for commercial use.


### **Support**

If you find this app useful, please consider supporting its development. 
Your support helps maintain and improve the app.

Support: <a href="https://github.com/sponsors/KFrost-Sponsor" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; cursor: pointer;">GitHub Sponsors</a>