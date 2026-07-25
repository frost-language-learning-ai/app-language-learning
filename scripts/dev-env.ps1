# Development Environment Setup Script
# Check Ollama, PostgreSQL → Start Server + Frontend

param(
    [switch]$OllamaOnly = $false,
    [switch]$ServerOnly = $false,
    [switch]$FrontendOnly = $false
)

$ErrorActionPreference = "Stop"

# Color definitions
$ColorSuccess = "Green"
$ColorWarning = "Yellow"
$ColorError = "Red"
$ColorInfo = "Cyan"

Write-Host "=== Development Environment Setup ===" -ForegroundColor $ColorInfo
Write-Host ""

# 1. Prerequisites check
if (-not $ServerOnly -and -not $FrontendOnly) {
    Write-Host "[1] Checking prerequisites..." -ForegroundColor $ColorWarning
    
    # Ollama check
    $ollama = Get-Command ollama -ErrorAction SilentlyContinue
    if (-not $ollama) {
        Write-Host "✗ Ollama is not installed" -ForegroundColor $ColorError
        Write-Host "  Run: ./scripts/setup-ollama.ps1" -ForegroundColor $ColorInfo
        exit 1
    }
    Write-Host "✓ Ollama: installed" -ForegroundColor $ColorSuccess
    
    # PostgreSQL check
    $psql = Get-Command psql -ErrorAction SilentlyContinue
    if (-not $psql) {
        Write-Host "✗ PostgreSQL (psql) not found" -ForegroundColor $ColorError
        Write-Host "  Install from: https://www.postgresql.org/download/windows/" -ForegroundColor $ColorInfo
        exit 1
    }
    Write-Host "✓ PostgreSQL: installed" -ForegroundColor $ColorSuccess
    
    # Node.js check
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
        Write-Host "✗ Node.js not found" -ForegroundColor $ColorError
        exit 1
    }
    Write-Host "✓ Node.js: installed" -ForegroundColor $ColorSuccess
    Write-Host ""
}

# 2. Environment variables check
if (-not $ServerOnly -and -not $FrontendOnly) {
    Write-Host "[2] Checking environment variables..." -ForegroundColor $ColorWarning
    
    if (-not $env:DATABASE_URL) {
        Write-Host "⚠ DATABASE_URL not set" -ForegroundColor $ColorWarning
        Write-Host "  Using default: postgres://postgres:postgres@localhost:5432/language_learning" -ForegroundColor $ColorInfo
        $env:DATABASE_URL = "postgres://postgres:postgres@localhost:5432/language_learning"
    } else {
        Write-Host "✓ DATABASE_URL: configured" -ForegroundColor $ColorSuccess
    }
    Write-Host ""
}

# 3. Start Ollama
if ($OllamaOnly -or (-not $ServerOnly -and -not $FrontendOnly)) {
    Write-Host "[3] Starting Ollama server in background..." -ForegroundColor $ColorWarning
    
    # Check if already running
    $ollamaProcess = Get-Process ollama -ErrorAction SilentlyContinue
    if ($ollamaProcess) {
        Write-Host "✓ Ollama is already running (PID: $($ollamaProcess.Id))" -ForegroundColor $ColorSuccess
    } else {
        Write-Host "  Starting ollama serve in background..." -ForegroundColor $ColorInfo
        Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 3
        Write-Host "✓ Ollama started" -ForegroundColor $ColorSuccess
    }
    Write-Host "  API: http://127.0.0.1:11434" -ForegroundColor $ColorInfo
    
    if ($OllamaOnly) {
        Write-Host ""
        Write-Host "Ollama is running." -ForegroundColor $ColorSuccess
        Write-Host "Run the following in another terminal:" -ForegroundColor $ColorInfo
        Write-Host "  ./scripts/dev-env.ps1 -ServerOnly   # Server only" -ForegroundColor Gray
        Write-Host "  ./scripts/dev-env.ps1 -FrontendOnly # Frontend only" -ForegroundColor Gray
        exit 0
    }
    Write-Host ""
}

# 4. Start server and frontend in parallel
if ($ServerOnly -or $FrontendOnly) {
    if (-not $FrontendOnly) {
        Write-Host "[4] Starting API server..." -ForegroundColor $ColorWarning
        
        if (-not (Test-Path "server")) {
            Write-Host "✗ server directory not found" -ForegroundColor $ColorError
            exit 1
        }
        
        Write-Host "  Running: npm run server:dev" -ForegroundColor $ColorInfo
        Write-Host "  http://localhost:8787" -ForegroundColor $ColorInfo
        Write-Host ""
        
        & npm run server:dev
    }
    
    # 5. Start frontend
    if (-not $ServerOnly) {
        Write-Host "[5] Starting frontend..." -ForegroundColor $ColorWarning
        
        if (-not (Test-Path "index.html")) {
            Write-Host "✗ index.html not found" -ForegroundColor $ColorError
            exit 1
        }
        
        Write-Host "  Running: npm run dev" -ForegroundColor $ColorInfo
        Write-Host "  http://localhost:5173" -ForegroundColor $ColorInfo
        Write-Host ""
        
        & npm run dev
    }
} else {
    # Start both server and frontend in parallel
    Write-Host "[4] Starting API server and frontend..." -ForegroundColor $ColorWarning
    Write-Host ""
    
    # Start server in background
    Write-Host "  Starting API server (background)..." -ForegroundColor $ColorInfo
    Write-Host "  http://localhost:8787" -ForegroundColor $ColorInfo
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run server:dev"
    
    # Give server time to start
    Start-Sleep -Seconds 3
    
    # Start frontend in background
    Write-Host "  Starting frontend (background)..." -ForegroundColor $ColorInfo
    Write-Host "  http://localhost:5173" -ForegroundColor $ColorInfo
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
    
    Write-Host ""
    Write-Host "✓ Both servers started in separate terminals" -ForegroundColor $ColorSuccess
    Write-Host ""
    Write-Host "Available commands:" -ForegroundColor $ColorInfo
    Write-Host "  ./scripts/dev-env.ps1 -ServerOnly   # Server only" -ForegroundColor Gray
    Write-Host "  ./scripts/dev-env.ps1 -FrontendOnly # Frontend only" -ForegroundColor Gray
    Write-Host ""
}
