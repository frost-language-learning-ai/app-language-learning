# Detailed Setup Guide

This guide provides step-by-step instructions for setting up the Language Learning App on any platform.

## System Requirements

### Minimum
- OS: Windows 10, macOS 10.15, Ubuntu 18.04, or later
- CPU: Dual-core processor
- RAM: 8GB (Ollama + App)
- Disk: 10GB free (including models)
- Internet: For initial setup and model downloads

### Recommended
- OS: Windows 11, macOS 12+, Ubuntu 22.04+
- CPU: Quad-core processor
- RAM: 16GB or more
- Disk: 20GB SSD
- GPU: NVIDIA/AMD/Intel (for faster inference, optional)

## Step 1: Install Prerequisites

### Windows

#### 1.1 Install Node.js

1. Visit [nodejs.org](https://nodejs.org)
2. Download LTS version (20.x or later)
3. Run installer and accept defaults
4. Verify installation:
```powershell
node --version    # Should show v20.x.x or higher
npm --version     # Should show 10.x.x or higher
```

#### 1.2 Install PostgreSQL

1. Visit [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
2. Download PostgreSQL 15+
3. Run installer:
   - Choose installation directory
   - Set superuser password (e.g., "postgres")
   - Port: 5432 (default)
   - Locale: [system default]
4. Complete installation

5. Verify installation:
```powershell
psql --version
psql -U postgres -c "SELECT 1"  # Should return (1)
```

#### 1.3 Install Git

1. Visit [git-scm.com](https://git-scm.com)
2. Download for Windows
3. Run installer with default settings

### macOS

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Install PostgreSQL
brew install postgresql@15
brew services start postgresql@15

# Install Git
brew install git

# Verify
node --version
npm --version
psql --version
git --version
```

### Linux (Ubuntu/Debian)

```bash
# Update package manager
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Git
sudo apt install -y git

# Verify
node --version
npm --version
psql --version
git --version
```

## Step 2: Install Ollama

### Windows

1. Visit [ollama.com/download/windows](https://ollama.com/download/windows)
2. Download the installer
3. Run `OllamaSetup.exe`
4. Complete installation
5. Restart your computer
6. Verify installation:
```powershell
ollama --version
ollama list  # Should show available models
```

### macOS

```bash
# Download and install
curl -fsSL https://ollama.com/install.sh | sh

# Verify
ollama --version
ollama list
```

### Linux

```bash
# Download and install
curl -fsSL https://ollama.com/install.sh | sh

# Verify
ollama --version
ollama list

# Start service (if needed)
sudo systemctl start ollama
sudo systemctl enable ollama
```

### Download Required Models

This step downloads the AI models (~3-4GB total):

```bash
# Start Ollama service (if not running)
ollama serve &

# Download models in another terminal
ollama pull gemma3:4b           # Text generation (~2GB)
ollama pull embeddinggemma      # Embeddings (~800MB)

# Verify models
ollama list
# Should show:
# NAME                      ID              SIZE      MODIFIED
# gemma3:4b                 <hash>          2.0 GB    2 minutes ago
# embeddinggemma            <hash>          800 MB    1 minute ago
```

## Step 3: Clone Repository

```bash
# Create a directory for the project
mkdir ~/projects
cd ~/projects

# Clone the repository
git clone <repository-url>
cd app-language-learning

# Verify you're on the right branch
git status
```

## Step 4: Install Node.js Dependencies

```bash
# Install all npm packages
npm install

# This will download ~500MB of packages (takes 2-5 minutes)
# Wait for it to complete

# Verify installation
npm list | head -20
```

## Step 5: Setup Database

### Create Database

```bash
# Login as PostgreSQL superuser
psql -U postgres

# In psql, create the database:
CREATE DATABASE language_learning;
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

Or in one command:

```bash
# Windows
psql -U postgres -c "CREATE DATABASE language_learning;" -c "CREATE EXTENSION vector;"

# macOS/Linux
sudo -u postgres psql -c "CREATE DATABASE language_learning;" -c "CREATE EXTENSION vector;"
```

### Run Migrations

```bash
# Navigate to project directory (if not already there)
cd app-language-learning

# Run migration script
psql "postgres://postgres:postgres@localhost:5432/language_learning" -f server/migrations/001_language_learning_init.sql

# Verify tables were created
psql "postgres://postgres:postgres@localhost:5432/language_learning" -c "\dt"

# Should show: words, users, user_words, pronunciation_records, etc.
```

### Configure Database Connection

Create `.env.local` file in project root:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/language_learning
```

If you used different PostgreSQL credentials, update accordingly.

## Step 6: Environment Configuration

Create `.env.local` in the project root with these settings:

```env
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/language_learning

# Ollama Configuration
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:4b
OLLAMA_EMBEDDING_MODEL=embeddinggemma

# Whisper Model (for transcription)
WHISPER_MODEL=Xenova/whisper-tiny

# API Server
API_PORT=3000
API_HOST=localhost

# Development
NODE_ENV=development
DEBUG=app:*
```

## Step 7: Test Setup

### Verify Ollama Connection

```bash
# Ollama should be running in a terminal
ollama serve

# In another terminal, test connection
curl http://127.0.0.1:11434/api/tags

# Should return JSON with available models
```

### Test Database Connection

```bash
# From project root
node -e "
const pg = require('pg');
const client = new pg.Client(process.env.DATABASE_URL);
client.connect((err) => {
  if (err) console.error('DB Error:', err);
  else console.log('✓ Database connected');
  client.end();
});
"
```

### Run Setup Script

```bash
# This will verify all components
npm run setup
```

Should show:
```
[1] Checking Ollama installation...
✓ Ollama is installed

[2] Installing npm dependencies...
✓ npm dependencies installed

[3] Setting up database...
✓ Database setup completed

[4] Downloading Ollama models...
✓ gemma3:4b downloaded
✓ embeddinggemma downloaded

✓ Setup completed successfully!
```

## Step 8: Start Development

Open 3 terminals:

### Terminal 1: Start Ollama Service

```bash
ollama serve
# Should show: Listening on 127.0.0.1:11434
```

### Terminal 2: Start API Server

```bash
cd app-language-learning
npm run server:dev

# Should show:
# ✓ Listening on http://localhost:3000
```

### Terminal 3: Start Frontend

```bash
cd app-language-learning
npm run react:start

# Should show:
# VITE v5.0.0  ready in XXX ms
# ➜  Local:   http://127.0.0.1:5173/
```

### Access the App

Open browser and navigate to:
```
http://localhost:5173
```

## Troubleshooting Setup

### "ollama command not found"

**Windows**:
- Restart your computer after installing Ollama
- Check if `C:\Users\[YourName]\AppData\Local\Programs\Ollama` exists
- Add to PATH manually if needed

**macOS/Linux**:
- Verify installation: `which ollama`
- If not found, reinstall Ollama

### "Cannot connect to Ollama"

```bash
# Verify Ollama is running
ollama serve

# Check port availability
# Windows/PowerShell
Test-NetConnection -ComputerName 127.0.0.1 -Port 11434

# macOS/Linux
nc -zv 127.0.0.1 11434
```

### "Database connection failed"

```bash
# Check PostgreSQL is running
# Windows: Services → PostgreSQL should be Running
# macOS: brew services list | grep postgresql
# Linux: sudo systemctl status postgresql

# Test connection
psql "postgres://postgres:postgres@localhost:5432/language_learning"

# If fails, verify credentials in .env.local
```

### "npm install fails"

```bash
# Clear npm cache
npm cache clean --force

# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

### "Port 3000 or 5173 already in use"

```bash
# Windows/PowerShell
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

## Next Steps

After successful setup:

1. **Read Documentation**:
   - [Development Guide](DEVELOPMENT.md) - Add features, debug issues
   - [Architecture Guide](ARCHITECTURE.md) - Understand system design
   - [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues

2. **Try the App**:
   - Search for words
   - Generate definitions
   - Record and analyze pronunciation
   - Check learning progress

3. **Customize**:
   - Modify colors and styling
   - Add new languages
   - Implement new features

## Advanced Setup Options

### Use Different PostgreSQL Credentials

1. Create PostgreSQL user:
```sql
CREATE USER appuser WITH PASSWORD 'your-secure-password';
CREATE DATABASE language_learning OWNER appuser;
```

2. Update `.env.local`:
```env
DATABASE_URL=postgres://appuser:your-secure-password@localhost:5432/language_learning
```

### Use Remote PostgreSQL

```env
DATABASE_URL=postgres://username:password@remote-host:5432/language_learning
```

### Use Different Ollama Host

```env
OLLAMA_BASE_URL=http://192.168.1.100:11434  # Remote Ollama server
```

### Use Smaller AI Models

For lower-end machines, use smaller models:

```bash
# Download lighter models
ollama pull mistral:7b-q4         # 5GB, good quality
ollama pull neural-chat:7b-q4     # 4GB, good for chat

# Update .env.local
OLLAMA_MODEL=mistral:7b-q4
```

## Getting Help

If you encounter issues during setup:

1. Check [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Review log files for error messages
3. Check that all prerequisites are installed correctly
4. Try running individual components separately
5. Create an issue with:
   - Error message
   - Your OS and versions
   - Steps you took
   - Output from diagnostic commands

## Additional Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Ollama Documentation](https://ollama.com)
- [Express.js Getting Started](https://expressjs.com/starter/basic-routing.html)
- [React Documentation](https://react.dev)
