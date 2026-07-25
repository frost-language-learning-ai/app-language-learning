# Development Guide

## Prerequisites

- **Node.js 20.0.0+** - JavaScript runtime
- **npm 10.0.0+** - Package manager
- **PostgreSQL 15+** - Database server
- **Ollama** - Local LLM inference
- **Git** - Version control

### Verify Installation

```bash
node --version      # Should be v20.0.0 or higher
npm --version       # Should be 10.0.0 or higher
psql --version      # Should be PostgreSQL 15+
ollama --version    # Should show version
```

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd app-language-learning
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

```bash
# Create database and install extensions
psql "postgres://postgres:postgres@localhost:5432/language_learning" -f server/migrations/001_language_learning_init.sql
```

### 4. Configure Environment

Create `.env.local` file in project root:

```env
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/language_learning

# Ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:4b
OLLAMA_EMBEDDING_MODEL=embeddinggemma
WHISPER_MODEL=Xenova/whisper-tiny

# API Server
API_PORT=3000
API_HOST=localhost

# Environment
NODE_ENV=development
DEBUG=app:*
```

## Development Workflow

### Terminal 1: Start Ollama Service

```bash
ollama serve
```

This starts the local Ollama API at `http://127.0.0.1:11434`

### Terminal 2: Start API Server

```bash
npm run server:dev
```

Features:
- Auto-reload on file changes (nodemon)
- Debug logging enabled
- API available at `http://localhost:3000`

### Terminal 3: Start Frontend Dev Server

```bash
npm run react:start
```

Features:
- Hot Module Replacement (HMR)
- Auto-refresh on changes
- Dev tools available
- App at `http://localhost:5173` (Vite default)

### Combined Start (Optional)

```bash
npm run dev:env
```

This starts all services together in a single terminal (less recommended for development as output is mixed).

## Project Structure for Development

```
src/                          # Frontend source code
├── components/              # Reusable React components
│   ├── WordCard.jsx        # Display word details
│   ├── SearchForm.jsx      # Search interface
│   └── PronunciationRecorder.jsx  # Audio recording
├── pages/                   # Page-level components
│   ├── HomePage.jsx        # Landing page
│   ├── LearningPage.jsx    # Learning interface
│   └── SearchPage.jsx      # Search results
├── services/               # API communication
│   ├── api.js             # API client
│   ├── wordService.js     # Word-related requests
│   ├── searchService.js   # Search requests
│   └── ollamaService.js   # Ollama integration
├── hooks/                 # Custom React hooks
│   ├── useWords.js        # Word data fetching
│   └── usePronunciation.js # Pronunciation logic
├── utils/                 # Utility functions
│   ├── audio.js          # Audio processing
│   ├── mfcc.js           # MFCC feature extraction
│   └── formatting.js     # Format utilities
├── styles/               # CSS files
│   ├── index.css         # Global styles
│   ├── components.css    # Component styles
│   └── pages.css         # Page-specific styles
├── App.jsx              # Root component
└── main.jsx            # Entry point

server/                         # Backend source code
├── routes/                     # API endpoint definitions
│   ├── words.js               # /api/words endpoints
│   ├── search.js              # /api/search endpoints
│   ├── pronunciation.js       # /api/pronunciation endpoints
│   └── index.js               # Route aggregation
├── controllers/                # Business logic
│   ├── wordController.js      # Word operations
│   ├── searchController.js    # Search operations
│   └── pronunciationController.js
├── services/                   # Reusable services
│   ├── ollamaService.js      # Ollama API calls
│   ├── embeddingService.js   # Vector operations
│   ├── transcriptionService.js # Whisper integration
│   └── pronunciationAnalyzer.js
├── middleware/                 # Express middleware
│   ├── errorHandler.js       # Error handling
│   ├── logger.js             # Request logging
│   └── auth.js               # Authentication
├── db/                         # Database layer
│   ├── connection.js         # PostgreSQL connection
│   ├── migrations/           # Migration scripts
│   └── queries.js            # Common queries
├── config/                     # Configuration
│   └── index.js              # App configuration
└── server.js                  # Express app entry point
```

## Common Development Tasks

### Add a New API Endpoint

1. **Create controller in `server/controllers/`**:
```javascript
// server/controllers/newController.js
export async function getNewData(req, res) {
  try {
    const data = await getDataFromService();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

2. **Create route in `server/routes/`**:
```javascript
// server/routes/newRoutes.js
import { Router } from 'express';
import { getNewData } from '../controllers/newController.js';

const router = Router();
router.get('/new-data', getNewData);

export default router;
```

3. **Register route in `server/routes/index.js`**:
```javascript
import newRoutes from './newRoutes.js';
// ...
app.use('/api', newRoutes);
```

### Add a New React Component

1. **Create component file in `src/components/`**:
```javascript
// src/components/NewComponent.jsx
import React, { useState } from 'react';
import './newComponent.css';

export function NewComponent() {
  const [state, setState] = useState(null);
  
  return (
    <div className="new-component">
      {/* Component JSX */}
    </div>
  );
}
```

2. **Create styles in `src/styles/`**:
```css
/* src/styles/newComponent.css */
.new-component {
  /* styles */
}
```

3. **Use in pages/components**:
```javascript
import { NewComponent } from '../components/NewComponent';

export function MyPage() {
  return <NewComponent />;
}
```

### Test Changes

```bash
# Run tests
npm run server:test
npm run react:test

# Run linting
npm run lint

# Build check
npm run react:build
```

## Debugging

### Frontend Debugging

1. **Browser DevTools**:
   - Open `http://localhost:5173`
   - Press `F12` to open developer tools
   - Use Console, Network, and Sources tabs

2. **React DevTools Extension**:
   - Install React DevTools for your browser
   - Inspect React component tree
   - View and modify component state

3. **Console Logging**:
```javascript
console.log('Debug info:', variable);
console.error('Error:', error);
```

### Backend Debugging

1. **Server Logs**:
   - Server outputs debug logs in terminal
   - Use `DEBUG=app:* npm run server:dev` for verbose logging

2. **VS Code Debugger**:
```javascript
// Add debugger statement
debugger;

// Run with debugger
node --inspect-brk server/server.js
```

3. **Request Logging**:
```javascript
// All requests logged automatically
// Check terminal output for request details
```

### Database Debugging

```bash
# Connect to database
psql "postgres://postgres:postgres@localhost:5432/language_learning"

# Common queries
SELECT * FROM words LIMIT 10;
SELECT * FROM users;
SELECT * FROM word_embeddings;
```

## Performance Optimization

### Frontend Performance

1. **React Optimization**:
   - Use React.memo for components
   - Implement useCallback for event handlers
   - Lazy load components with React.lazy()

2. **Bundle Size**:
```bash
# Check bundle size
npm run react:build

# Analyze dependencies
npm install -g webpack-bundle-analyzer
```

3. **Lazy Loading**:
```javascript
// Load components on demand
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));
```

### Backend Performance

1. **Database Query Optimization**:
   - Add indexes on frequently searched columns
   - Use EXPLAIN to analyze queries
   - Cache query results

2. **API Response Caching**:
```javascript
// Cache middleware
const cache = new Map();

function getCached(key, getter, ttl = 60000) {
  if (cache.has(key)) return cache.get(key);
  const value = getter();
  cache.set(key, value);
  setTimeout(() => cache.delete(key), ttl);
  return value;
}
```

3. **Model Inference Optimization**:
   - Batch requests when possible
   - Use smaller models for quick operations
   - Cache embeddings

## Memory Usage Monitoring

### Monitor Ollama Memory
```bash
# Check Ollama process
ps aux | grep ollama
# or on Windows
tasklist | findstr ollama

# Monitor with system tools
# Windows: Task Manager
# macOS: Activity Monitor
# Linux: htop
```

### Reduce Memory Usage

1. **Smaller Models**:
   - Replace Gemma3 4B with smaller alternatives
   - Use quantized versions

2. **Clear Caches**:
```bash
# Restart Ollama to clear model cache
ollama serve  # Restart with different models loaded
```

3. **Monitor Frontend Memory**:
   - Use React DevTools Profiler
   - Check browser memory usage in DevTools

## Code Quality

### Linting

```bash
npm run lint          # Run ESLint
npm run lint:fix      # Auto-fix issues
```

### Formatting

```bash
npm run format        # Format code with Prettier
npm run format:check  # Check formatting
```

### Testing

```bash
npm run server:test   # Run backend tests
npm run react:test    # Run frontend tests
npm run test:coverage # Generate coverage reports
```

## Recommended IDE Setup

### VS Code Extensions

- **ES7+ React/Redux/React-Native snippets** - dsznajder.es7-react-js-snippets
- **Prettier - Code formatter** - esbenp.prettier-vscode
- **ESLint** - dbaeumer.vscode-eslint
- **PostgreSQL** - ckolkman.vscode-postgres
- **REST Client** - humao.rest-client
- **Thunder Client** - rangav.vscode-thunder-client

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## Troubleshooting Development Issues

### Port Already in Use

```bash
# Windows/PowerShell
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/macOS
lsof -i :3000
kill -9 <PID>
```

### Module Not Found

```bash
# Clear and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Database Connection Error

```bash
# Verify PostgreSQL is running
psql --version
psql "postgres://postgres:postgres@localhost:5432/language_learning"
```

### Ollama Not Available

```bash
# Start Ollama service
ollama serve

# Verify connection
curl http://127.0.0.1:11434/api/tags
```

## Learning Resources

### Frontend
- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)

### Backend
- [Express.js Guide](https://expressjs.com)
- [PostgreSQL Tutorial](https://www.postgresql.org/docs)
- [pgvector Extension](https://github.com/pgvector/pgvector)

### AI/ML
- [Ollama Documentation](https://ollama.com)
- [Gemma Model Card](https://huggingface.co/google/gemma-7b)
- [Whisper Documentation](https://github.com/openai/whisper)

## Getting Help

If you encounter issues:
1. Check [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Review [Architecture Guide](ARCHITECTURE.md)
3. Create an issue with:
   - Error message and stack trace
   - Steps to reproduce
   - System information
   - Screenshots if applicable
