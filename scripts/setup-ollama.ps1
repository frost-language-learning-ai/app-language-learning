# Ollama Setup Script
# Check installation → Install (if needed) → Download models → Start
#
# NOTE: Ollama and Gemma models are completely free and open source.
# All processing runs locally on your machine with no cloud charges.

param(
    [switch]$SkipInstall = $false,
    [switch]$SkipModels = $false,
    [switch]$NoLaunch = $false
)

$ErrorActionPreference = "Stop"

Write-Host "=== Ollama Setup Script ===" -ForegroundColor Cyan

# 1. Check if Ollama is installed
Write-Host ""
Write-Host "[1] Checking Ollama installation status..." -ForegroundColor Yellow
$ollamaPath = Get-Command ollama -ErrorAction SilentlyContinue

if ($ollamaPath) {
    Write-Host "✓ Ollama is already installed" -ForegroundColor Green
    $ollamaVersion = & ollama --version 2>$null
    Write-Host "  Version: $ollamaVersion" -ForegroundColor Gray
} else {
    Write-Host "✗ Ollama is not installed" -ForegroundColor Red
    
    if ($SkipInstall) {
        Write-Host "  -SkipInstall flag specified, skipping installation check" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Install manually: https://ollama.com/download" -ForegroundColor Cyan
        exit 1
    }
    
    Write-Host ""
    Write-Host "[2] Installing Ollama..." -ForegroundColor Yellow
    
    # Install using official Windows installer
    Write-Host "  Installing via official Ollama installer..." -ForegroundColor Gray
    $installerUrl = "https://ollama.com/download/OllamaSetup.exe"
    $tempPath = "$env:TEMP\OllamaSetup.exe"
    
    try {
        # Download the installer
        Write-Host "  Downloading installer..." -ForegroundColor Gray
        Invoke-WebRequest -Uri $installerUrl -OutFile $tempPath -UseBasicParsing -ErrorAction Stop
        
        # Run the installer silently
        Write-Host "  Running installer (background)..." -ForegroundColor Gray
        $installProcess = Start-Process -FilePath $tempPath -ArgumentList "/SILENT" -PassThru -Wait
        
        # Wait a bit more for system files to settle
        Start-Sleep -Seconds 8
        
        # Refresh environment variables
        Write-Host "  Refreshing environment variables..." -ForegroundColor Gray
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        # Clean up
        Remove-Item $tempPath -Force -ErrorAction SilentlyContinue
        
        # Verify installation
        $ollamaVerify = Get-Command ollama -ErrorAction SilentlyContinue
        if ($ollamaVerify) {
            Write-Host "✓ Ollama installation completed successfully" -ForegroundColor Green
        } else {
            Write-Host "⚠ Ollama may not be properly installed. Try manual installation." -ForegroundColor Yellow
            Write-Host "  https://ollama.com/download" -ForegroundColor Cyan
            exit 1
        }
    } catch {
        Write-Host "⚠ Ollama installation failed. Please install manually." -ForegroundColor Yellow
        Write-Host "  https://ollama.com/download" -ForegroundColor Cyan
        exit 1
    }
}

# 2. Download models
if (-not $SkipModels) {
    Write-Host ""
    Write-Host "[3] Downloading required models..." -ForegroundColor Yellow
    
    $models = @("gemma3:4b", "embeddinggemma")
    
    foreach ($model in $models) {
        Write-Host "  Pulling $model..." -ForegroundColor Gray
        & ollama pull $model
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠ Failed to download $model" -ForegroundColor Yellow
        } else {
            Write-Host "  ✓ $model download completed" -ForegroundColor Green
        }
    }
}

# 3. Start Ollama server
if ($NoLaunch) {
    Write-Host ""
    Write-Host "[4] -NoLaunch flag specified, skipping server startup" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "[4] Starting Ollama server..." -ForegroundColor Yellow
    
    # Check if already running
    $ollamaProcess = Get-Process ollama -ErrorAction SilentlyContinue
    if ($ollamaProcess) {
        Write-Host "  ✓ Ollama is already running (PID: $($ollamaProcess.Id))" -ForegroundColor Green
        Write-Host ""
        Write-Host "Ollama server is ready." -ForegroundColor Green
        Write-Host "API endpoint: http://127.0.0.1:11434" -ForegroundColor Cyan
    } else {
        Write-Host "  Running: ollama serve" -ForegroundColor Gray
        Write-Host "  API endpoint: http://127.0.0.1:11434" -ForegroundColor Cyan
        Write-Host ""
        
        # Start Ollama in a new window
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "ollama serve"
        
        Write-Host "Ollama server started in a new terminal." -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "To start development environment, run:" -ForegroundColor Cyan
    Write-Host "  ./scripts/dev-env.ps1" -ForegroundColor Gray
}
