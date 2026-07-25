#!/bin/bash

# Ollama Setup Script
# Check installation → Install (if needed) → Download models → Start
# Supports: Linux, macOS
#
# NOTE: Ollama and Gemma models are completely free and open source.
# All processing runs locally on your machine with no cloud charges.

set -e

SKIP_INSTALL=false
SKIP_MODELS=false
NO_LAUNCH=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -SkipInstall|--skip-install)
            SKIP_INSTALL=true
            shift
            ;;
        -SkipModels|--skip-models)
            SKIP_MODELS=true
            shift
            ;;
        -NoLaunch|--no-launch)
            NO_LAUNCH=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "=== Ollama Setup Script ==="
echo ""

# 1. Check if Ollama is installed
echo "[1] Checking Ollama installation status..."
if command -v ollama &> /dev/null; then
    echo "✓ Ollama is already installed"
    ollama --version
else
    echo "✗ Ollama is not installed"
    
    if [ "$SKIP_INSTALL" = true ]; then
        echo "  -SkipInstall flag specified, skipping installation check"
        echo ""
        echo "Install manually: https://ollama.com/download"
        exit 1
    fi
    
    echo ""
    echo "[2] Installing Ollama..."
    
    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo "  Detected: Linux"
        echo "  Installing via official script..."
        curl -fsSL https://ollama.com/install.sh | sh
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        echo "  Detected: macOS"
        echo "  Downloading Ollama.zip..."
        TEMP_DIR=$(mktemp -d)
        curl -fsSL https://ollama.com/download/Ollama-darwin.zip -o "$TEMP_DIR/Ollama.zip"
        
        echo "  Extracting and installing..."
        unzip -q "$TEMP_DIR/Ollama.zip" -d /Applications/ || true
        rm -rf "$TEMP_DIR"
        
        echo "✓ Ollama installation completed"
    else
        echo "⚠ Unsupported OS: $OSTYPE"
        echo "  Install manually: https://ollama.com/download"
        exit 1
    fi
fi

# 2. Download models
if [ "$SKIP_MODELS" = false ]; then
    echo ""
    echo "[3] Downloading required models..."
    
    models=("gemma3:4b" "embeddinggemma")
    
    for model in "${models[@]}"; do
        echo "  Pulling $model..."
        ollama pull "$model" || {
            echo "⚠ Failed to download $model"
        }
    done
fi

# 3. Start Ollama server
if [ "$NO_LAUNCH" = true ]; then
    echo ""
    echo "[4] -NoLaunch flag specified, skipping server startup"
else
    echo ""
    echo "[4] Starting Ollama server..."
    echo "  Running: ollama serve"
    echo ""
    echo "Ollama server started."
    echo "API endpoint: http://127.0.0.1:11434"
    echo ""
    echo "Run the following in another terminal:"
    echo "  npm run server:dev"
    echo ""
    
    ollama serve
fi
