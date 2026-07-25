# Language Learning Implementation

## Architecture

- Frontend: React + Vite (`src/components/language-learning/*`)
- API: Node.js + Express (`server/src/*`)
- Database: PostgreSQL + pgvector
- Generation and evaluation: local Ollama/Gemma
- Embeddings: local Ollama `embeddinggemma`
- Speech recognition: local Whisper via `@huggingface/transformers`
- Acoustic comparison: browser-side MFCC extraction with Meyda and DTW alignment

## Main APIs

- `POST /api/fast-pipeline/preview`: generate a vocabulary preview with Ollama
- `POST /api/fast-pipeline/confirm`: save a vocabulary term
- `POST /api/knowledge-nodes`: save a searchable learning note
- `POST /api/reasoning/ask`: answer a learning question with Ollama
- `POST /api/audio/transcribe`: transcribe 16 kHz PCM audio with local Whisper
- `POST /api/audio/evaluate-pronunciation`: return Gemma coaching based on MFCC, waveform, timing, and Whisper output
- `POST /api/search/semantic`: vector similarity search with pgvector

## Pronunciation Analysis

1. Select a native reference recording and record the learner's voice.
2. Extract MFCC features locally in the renderer and align both recordings with DTW.
3. Transcribe the recordings locally with Whisper.
4. Send only the local analysis values and transcript to Ollama/Gemma for improvement advice.

Whisper downloads its model on first use and caches it locally. No API key, cloud token, or Google service account is required.

## Validation and Testing

- Request input: Zod
- Ollama JSON output: AJV JSON Schema
- API errors: common error middleware
- Tests: `npm run server:test`
