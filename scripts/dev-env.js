#!/usr/bin/env node

/**
 * Development Environment Launcher
 * Starts Ollama (if needed) + Server + Frontend in parallel
 * Works on Windows, macOS, and Linux
 */

import { execSync, spawn } from "child_process";
import { platform } from "os";
import process from "process";

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m"
};

function log(color, ...args) {
  console.log(`${colors[color]}${args.join(" ")}${colors.reset}`);
}

function logSection(num, title) {
  log("cyan", `\n[${num}] ${title}`);
}

function isOllamaRunning() {
  try {
    execSync("ollama list", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function startOllama() {
  logSection(1, "Starting Ollama server...");
  
  const osType = platform();
  
  if (isOllamaRunning()) {
    log("green", "✓ Ollama is already running");
    return Promise.resolve();
  }
  
  return new Promise((resolve) => {
    try {
      if (osType === "win32") {
        // Windows: Start in new window
        spawn("powershell", ["-Command", "ollama serve"], {
          detached: true,
          stdio: "ignore"
        }).unref();
      } else {
        // macOS/Linux: Start in background
        spawn("ollama", ["serve"], {
          detached: true,
          stdio: "ignore"
        }).unref();
      }
      
      log("green", "✓ Ollama started");
      log("gray", "  API: http://127.0.0.1:11434");
      
      // Wait for Ollama to be ready
      log("yellow", "  Waiting for Ollama to be ready...");
      let attempts = 0;
      const checkInterval = setInterval(() => {
        try {
          execSync("ollama list", { stdio: "pipe" });
          log("green", "  ✓ Ollama is ready");
          clearInterval(checkInterval);
          resolve();
        } catch {
          attempts++;
          if (attempts % 5 === 0) {
            process.stdout.write(".");
          }
          if (attempts > 30) {
            clearInterval(checkInterval);
            log("yellow", "\n  ⚠ Ollama startup timeout, continuing anyway...");
            resolve();
          }
        }
      }, 1000);
    } catch (error) {
      log("red", "✗ Failed to start Ollama");
      log("yellow", "  Make sure Ollama is installed: https://ollama.com/download");
      resolve();
    }
  });
}

function startServer() {
  logSection(2, "Starting API server...");
  
  log("yellow", "  Running: npm run server:dev");
  log("gray", "  http://localhost:8787");
  
  const server = spawn("npm", ["run", "server:dev"], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env }
  });
  
  return server;
}

function startFrontend() {
  logSection(3, "Starting frontend dev server...");
  
  log("yellow", "  Running: npm run react:start");
  log("gray", "  http://localhost:5173");
  
  const frontend = spawn("npm", ["run", "react:start"], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env }
  });
  
  return frontend;
}

async function main() {
  const args = process.argv.slice(2);
  const serverOnly = args.includes("-s") || args.includes("--server-only");
  const frontendOnly = args.includes("-f") || args.includes("--frontend-only");
  
  log("cyan", "=== Language Learning - Development Environment ===");
  
  // Set default environment variables if not already set
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:5432/language_learning";
    log("yellow", "[ENV] Setting DATABASE_URL:");
    log("gray", `  ${process.env.DATABASE_URL}`);
  } else {
    log("green", "[ENV] ✓ DATABASE_URL is already set");
  }
  
  if (!process.env.OLLAMA_BASE_URL) {
    process.env.OLLAMA_BASE_URL = "http://127.0.0.1:11434";
    log("yellow", "[ENV] Setting OLLAMA_BASE_URL:");
    log("gray", `  ${process.env.OLLAMA_BASE_URL}`);
  }
  
  if (!process.env.OLLAMA_MODEL) {
    process.env.OLLAMA_MODEL = "gemma3:4b";
    log("yellow", "[ENV] Setting OLLAMA_MODEL: gemma3:4b");
  }
  
  if (!process.env.OLLAMA_EMBEDDING_MODEL) {
    process.env.OLLAMA_EMBEDDING_MODEL = "embeddinggemma";
    log("yellow", "[ENV] Setting OLLAMA_EMBEDDING_MODEL: embeddinggemma");
  }
  log("");
  
  const processes = [];
  
  if (!frontendOnly) {
    processes.push(startServer());
  }
  
  // Small delay before starting frontend
  await new Promise(r => setTimeout(r, 2000));
  
  if (!serverOnly) {
    processes.push(startFrontend());
  }
  
  log("green", "\n✓ Development environment is running");
  log("cyan", "\nAvailable endpoints:");
  if (!frontendOnly) {
    log("gray", "  API:      http://localhost:8787");
  }
  if (!serverOnly) {
    log("gray", "  Frontend: http://localhost:5173");
  }
  if (!serverOnly && !frontendOnly) {
    log("gray", "  Ollama:   http://127.0.0.1:11434");
  }
  
  log("cyan", "\nOptions:");
  log("gray", "  npm run dev:env              # Start all (default)");
  log("gray", "  npm run dev:env -- -s        # Server only");
  log("gray", "  npm run dev:env -- -f        # Frontend only");
  
  // Keep the process alive
  await new Promise(() => {});
}

main().catch((error) => {
  log("red", "Error:", error.message);
  process.exit(1);
});
