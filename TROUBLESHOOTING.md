# Troubleshooting Guide

## Ollama Installation Issues

### PowerShell Security Module Error

**Error Message:**
```
The 'Get-AuthenticodeSignature' command was not found...
iex : The 'Get-AuthenticodeSignature' command was found in the module 'Microsoft.PowerShell.Security', 
but the module could not be loaded.
```

**Cause**: PowerShell's security module cannot be loaded, typically due to execution policy or module loading issues.

**Solution**: The setup script automatically tries multiple installation methods:
1. PowerShell script (official)
2. Winget (Windows package manager)
3. Chocolatey (if installed)

If all fail, try manually:

```powershell
# Method 1: Direct PowerShell (as Administrator)
powershell -ExecutionPolicy Bypass -Command "irm https://ollama.com/install.ps1 | iex"

# Method 2: Winget
winget install Ollama.Ollama

# Method 3: Chocolatey
choco install ollama

# Method 4: Manual download
# Visit https://ollama.com/download/windows
```

### Terminal Restart Needed After Installation

**Symptom**: Installation script completes but `ollama --version` still fails

**Solution**:
```bash
# Close current terminal completely and open a new one, then:
npm run setup
```

This is necessary because the PATH environment variable is updated during installation and needs to be reloaded.

### Ollama Command Not Found After Installation

**Symptom**: Even after restart, `ollama` command is not found

**Solutions**:
- Verify Ollama is installed in the correct location:
  - Windows: `C:\Users\[YourUser]\AppData\Local\Programs\Ollama`
  - macOS: `/Applications/Ollama.app`
  - Linux: `/usr/local/bin/ollama` or `/usr/bin/ollama`
- Add to PATH manually if needed
- Reinstall Ollama

## Ollama Connection Issues

### Cannot Connect to Ollama

**Error**: `Failed to connect to Ollama at http://127.0.0.1:11434`

**Solutions**:
1. Start Ollama service:
   ```bash
   ollama serve
   ```

2. Verify Ollama is running:
   ```bash
   ollama --version
   ollama list
   ```

3. Check if port 11434 is accessible:
   ```bash
   # Windows/PowerShell
   Test-NetConnection -ComputerName 127.0.0.1 -Port 11434
   
   # Linux/macOS
   nc -zv 127.0.0.1 11434
   ```

4. Verify `OLLAMA_BASE_URL` environment variable:
   ```bash
   echo $env:OLLAMA_BASE_URL  # Windows/PowerShell
   echo $OLLAMA_BASE_URL      # Linux/macOS
   ```

5. On Windows: Ollama might need to be started from the system tray
   - Look for the Ollama icon in the system tray
   - Click to bring up the window

### Model Not Found

**Error**: `Error: model not found: gemma3:4b`

**Solutions**:
1. Download the required models:
   ```bash
   ollama pull gemma3:4b
   ollama pull embeddinggemma
   ```

2. Verify models are downloaded:
   ```bash
   ollama list
   ```

3. Check that Ollama has enough disk space for models (~4-6GB)

## Database Issues

### PostgreSQL Connection Failed

**Error**: `FATAL: remaining connection slots are reserved for non-replication superuser connections`

**Solutions**:
1. Verify PostgreSQL is running
2. Check credentials in `DATABASE_URL`:
   ```bash
   # Default connection string
   postgres://postgres:postgres@localhost:5432/language_learning
   ```
3. On Windows: Start PostgreSQL service from Services panel
4. On Linux/macOS: Start PostgreSQL service:
   ```bash
   brew services start postgresql  # macOS
   sudo systemctl start postgresql # Linux
   ```

### pgvector Extension Not Found

**Error**: `ERROR: function vector(internal) does not exist`

**Solution**:
```sql
-- Connect to the language_learning database and run:
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation:
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Migration Failed

**Error**: Migration file not found or cannot execute

**Solutions**:
1. Verify migration file exists:
   ```bash
   ls server/migrations/
   ```

2. Check database credentials and connection:
   ```bash
   psql "postgres://postgres:postgres@localhost:5432/language_learning"
   ```

3. Run migration manually:
   ```bash
   psql "postgres://postgres:postgres@localhost:5432/language_learning" -f server/migrations/001_language_learning_init.sql
   ```

4. Check PostgreSQL logs for detailed errors

## Whisper Transcription Issues

### Whisper Download on First Transcription

**Symptom**: First transcription takes 30-60 seconds, lots of downloading

**Explanation**: 
- This is normal and expected
- Whisper model (~150MB) is downloaded on first use
- Model is cached locally after the first download

**Solutions**:
- Ensure adequate internet connection
- Keep the API server running during download
- First run may take 1-2 minutes depending on internet speed
- Subsequent transcriptions will be much faster (2-5 seconds)

### Transcription Fails with No Output

**Error**: Transcription completes but returns empty result

**Solutions**:
1. Verify Ollama is running and accessible
2. Check if Whisper model is downloaded:
   ```bash
   ollama list | grep whisper
   ```
3. Check server logs for error messages
4. Try transcription again (sometimes it's a temporary issue)

### Transcription Memory Error

**Error**: `Out of memory` or `CUDA out of memory`

**Solutions**:
1. Reduce other running applications
2. Close browser tabs to free RAM
3. Ensure at least 2GB RAM is available for Whisper
4. Use CPU-only inference by setting `WHISPER_DEVICE=cpu`

## Performance Issues

### Slow Model Loading

**Symptom**: First API call takes 5+ seconds

**Causes**:
- Model is being loaded from disk into memory
- This is expected on first run after restarting server

**Solutions**:
- This is normal behavior, wait for first call to complete
- Subsequent calls will be faster (1-2 seconds)

### High Memory Usage

**Symptom**: Ollama process uses 8GB+ RAM

**Solutions**:
- Gemma3 4B requires ~4-6GB normally
- Close other applications
- Ensure no multiple Ollama instances are running
- Consider using a smaller model if memory is constrained

### CPU Utilization High

**Symptom**: CPU usage at 100% during inference

**Solutions**:
- This is normal during model inference
- GPU offloading (if available) can help
- Consider running model inference during off-hours

## Development Issues

### npm Dependencies Installation Failed

**Error**: `npm ERR! ...`

**Solutions**:
1. Clear npm cache:
   ```bash
   npm cache clean --force
   ```

2. Delete node_modules and reinstall:
   ```bash
   rm -r node_modules
   npm install
   ```

3. Update npm and Node.js:
   ```bash
   npm install -g npm@latest
   ```

### Frontend Build Fails

**Error**: Vite or React compilation errors

**Solutions**:
1. Check Node.js version (must be 20+):
   ```bash
   node --version
   ```

2. Clear Vite cache:
   ```bash
   rm -r node_modules/.vite
   ```

3. Rebuild:
   ```bash
   npm run react:build
   ```

### API Server Fails to Start

**Error**: `Port 3000 already in use` or similar

**Solutions**:
1. Find and kill the process using the port:
   ```bash
   # Windows/PowerShell
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # Linux/macOS
   lsof -i :3000
   kill -9 <PID>
   ```

2. Change port in `.env` or server config:
   ```bash
   PORT=3001 npm run server:dev
   ```

## Getting Help

If you encounter an issue not listed here:

1. Check the [Architecture](ARCHITECTURE.md) document to understand system design
2. Review [Development](DEVELOPMENT.md) guide for setup tips
3. Check server logs for detailed error messages
4. Create an issue in the repository with:
   - Error message (full stack trace)
   - Steps to reproduce
   - System information (OS, Node.js version, etc.)
   - Output of diagnostic commands
