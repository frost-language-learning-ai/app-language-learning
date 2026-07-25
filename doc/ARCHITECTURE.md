# System Architecture

## Project Overview

Language Learning App is a full-stack application that combines:
- **Frontend**: React single-page application
- **Backend**: Express.js REST API
- **Database**: PostgreSQL with pgvector extension
- **AI Models**: Ollama with Gemma3, Embedding-Gemma, and Whisper

All processing happens locally without cloud dependencies.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      User Devices                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web App    │  │  Android App │  │  iOS App     │      │
│  │ (React/Vite)│  │ (Capacitor)  │  │ (Capacitor)  │      │
│  │              │  │              │  │              │      │
│  │  Electron    │                                          │
│  │ (Desktop)    │                                          │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────┬─────────────────────────────────┘
                             │
                    HTTP/REST API
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                  Express.js Server                            │
│  (API Routes, Authentication, Business Logic)                │
└────────────────────────────┬─────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │     Ollama       │  │   File System   │
│   Database      │  │  (Local LLM)     │  │  (Models, etc)  │
│  + pgvector     │  │                  │  │                 │
│                 │  │ - Gemma3 4B      │  │                 │
│ Word Data       │  │ - Embedding      │  │ - Model Cache   │
│ User Progress   │  │ - Whisper        │  │ - Audio Files   │
│ Embeddings      │  │                  │  │                 │
└─────────────────┘  └──────────────────┘  └─────────────────┘
```

## Data Flow

### 1. Word Definition Flow
```
User Input (Word)
    ↓
React Frontend
    ↓
Express API /api/word/define
    ↓
Ollama (Gemma3) → Generate meaning, nuances, examples
    ↓
PostgreSQL → Store word data
    ↓
Response to Frontend
    ↓
Display Results
```

### 2. Semantic Search Flow
```
User Query
    ↓
React Frontend
    ↓
Express API /api/search
    ↓
Ollama (Embedding-Gemma) → Generate query embedding
    ↓
PostgreSQL + pgvector → Find similar embeddings
    ↓
Retrieve matching words
    ↓
Response to Frontend
    ↓
Display Search Results
```

### 3. Pronunciation Analysis Flow
```
User Records Audio
    ↓
React Frontend (WebRTC/MediaRecorder)
    ↓
Express API /api/pronunciation/analyze
    ↓
Ollama (Whisper) → Transcribe audio
    ↓
Signal Processing (MFCC) → Compare with reference
    ↓
Ollama (Gemma3) → Generate coaching feedback
    ↓
Response to Frontend
    ↓
Display Feedback
```

## Directory Structure

```
app-language-learning/
├── src/                              # Frontend React Application
│   ├── components/                  # React components
│   ├── pages/                       # Page components
│   ├── hooks/                       # Custom React hooks
│   ├── services/                    # API service layer
│   ├── styles/                      # CSS/styling
│   ├── utils/                       # Utility functions
│   └── App.jsx                      # Root component
│
├── server/                          # Backend Express Application
│   ├── routes/                      # API route definitions
│   │   ├── words.js                # Word endpoints
│   │   ├── search.js               # Search endpoints
│   │   ├── pronunciation.js        # Pronunciation endpoints
│   │   └── auth.js                 # Authentication endpoints
│   ├── controllers/                # Business logic
│   ├── services/                   # Service layer (Ollama, DB)
│   ├── middleware/                 # Express middleware
│   ├── migrations/                 # Database setup scripts
│   ├── db.js                       # Database connection
│   ├── ollama.js                   # Ollama service integration
│   └── server.js                   # Express app entry point
│
├── json/                           # Configuration Data
│   ├── categories.json             # Language learning categories
│   ├── languages.json              # Supported languages
│   └── currency.json               # Currency codes
│
├── scripts/                        # Automation Scripts
│   ├── setup-complete.js           # Complete setup (Ollama + DB + npm)
│   ├── dev-env.js                  # Development environment manager
│   ├── generate-icons.js           # App icon generation
│   └── kill-running.js             # Kill running processes
│
├── android/                        # Capacitor Android Build
│   ├── app/                        # Android app code
│   └── build.gradle                # Android build config
│
├── Desktop/electron/               # Electron Desktop App
│   ├── main.js                     # Electron main process
│   └── preload.js                  # Preload scripts
│
├── docs/                           # Documentation
│   ├── TROUBLESHOOTING.md          # Troubleshooting guide
│   ├── ARCHITECTURE.md             # This file
│   ├── DEVELOPMENT.md              # Development guide
│   └── DEPLOYMENT.md               # Deployment guide
│
├── capacitor.config.ts             # Capacitor iOS/Android config
├── vite.config.js                  # Vite bundler config (frontend)
├── jest.config.cjs                 # Jest test runner config
├── babel.config.cjs                # Babel transpiler config
├── package.json                    # npm dependencies & scripts
├── README.md                        # Main documentation
└── README_JP.md                    # Japanese documentation
```

## Technology Stack

### Frontend
- **React 18+** - UI framework
- **Vite** - Build tool (fast dev server)
- **Capacitor** - Cross-platform mobile (iOS/Android)
- **Electron** - Desktop app framework
- **CSS3** - Styling

### Backend
- **Node.js 20+** - Runtime
- **Express.js** - Web framework
- **PostgreSQL 15+** - Database
- **pgvector** - Vector similarity search

### AI & ML
- **Ollama** - Local LLM inference engine
- **Gemma3 4B** - Text generation model
- **embedding-gemma** - Embedding model for semantic search
- **Whisper (Xenova)** - Speech-to-text transcription

### Development Tools
- **npm** - Package manager
- **Jest** - Testing framework
- **Babel** - JavaScript transpiler

## Component Communication

### Frontend ↔ Backend

All communication uses REST API over HTTP/JSON:

```
Frontend (React)
    ↓
fetch() or axios
    ↓
Express Server (localhost:3000)
    ↓
Route Handlers
    ↓
Services (Ollama, PostgreSQL)
    ↓
Response JSON
    ↓
React State Update
    ↓
UI Re-render
```

### Backend ↔ Ollama

Communication via HTTP REST API:

```
Express Server
    ↓
HTTP Request to localhost:11434
    ↓
Ollama Service
    ↓
Model Inference
    ↓
JSON Response
    ↓
Process Results
```

### Backend ↔ PostgreSQL

Using node-postgres (pg) driver:

```
Express Server
    ↓
SQL Queries via pg
    ↓
PostgreSQL
    ↓
Query Results
    ↓
Data Processing
```

## Database Schema

### Core Tables

```sql
-- Users
users (id, email, password_hash, created_at)

-- Words & Definitions
words (id, word, language, definition, examples, created_at)
word_embeddings (word_id, embedding[1536])  -- pgvector

-- User Progress
user_words (id, user_id, word_id, status, learned_at)
pronunciation_records (id, user_id, word_id, audio_path, score)

-- Learning Data
learning_categories (id, name, description)
word_categories (word_id, category_id)
```

## API Endpoints

### Word Endpoints
- `GET /api/words` - List words
- `POST /api/words` - Create word
- `GET /api/words/:id` - Get word details
- `POST /api/words/define` - Generate definition with Ollama

### Search Endpoints
- `POST /api/search` - Semantic search
- `GET /api/search/history` - Get search history

### Pronunciation Endpoints
- `POST /api/pronunciation/analyze` - Analyze pronunciation
- `POST /api/pronunciation/upload` - Upload audio file

### Learning Endpoints
- `GET /api/user/progress` - Get learning progress
- `POST /api/user/mark-learned` - Mark word as learned

## Performance Considerations

### Model Inference Time
- First API call: ~3-5 seconds (model loading)
- Text generation: ~1-3 seconds
- Embedding generation: ~0.5-2 seconds
- Transcription: ~2-10 seconds (depends on audio length)

### Memory Usage
- Ollama + Gemma3 4B: ~4-6GB RAM
- PostgreSQL: ~500MB-1GB
- Frontend (React): ~50-100MB
- Total: ~5-8GB recommended

### Storage Requirements
- Gemma3 4B model: ~2-3GB
- embedding-gemma: ~500MB
- Whisper model: ~150MB
- PostgreSQL data: Variable (typically 100MB-1GB for typical usage)
- Total: ~5-6GB minimum

## Scalability

### Current Architecture
- Single-machine local deployment
- No distributed processing
- All models run on one device

### Limitations
- Cannot scale to multiple users simultaneously (single Ollama instance)
- Model inference is CPU/GPU bound
- Database queries might slow down with millions of words

### Future Improvements
- Multi-instance Ollama deployment
- Model quantization for smaller memory footprint
- Caching layer (Redis) for frequent queries
- Load balancing for multiple backend servers

## Security Considerations

### Current Implementation
- Local deployment (no internet exposure by default)
- No authentication required for local use
- All data stored locally on device

### For Production Deployment
- Implement authentication (JWT, OAuth2)
- Use HTTPS/TLS encryption
- Add rate limiting
- Validate all user inputs
- Sanitize database queries (use parameterized queries)
- Run Ollama in isolated environment
- Implement proper error handling (don't expose internals)

## Development Workflow

```
Development
    ↓
Local Testing (localhost)
    ↓
Build Process (Vite, Jest)
    ↓
Desktop Build (Electron)
    ↓
Mobile Build (Capacitor)
    ↓
Deploy
```

## Related Documentation

- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues and solutions
- [Development Guide](DEVELOPMENT.md) - Development setup and workflow
- [Deployment Guide](DEPLOYMENT.md) - Building and deploying the app
