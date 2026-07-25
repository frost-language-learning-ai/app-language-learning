#!/usr/bin/env node

/**
 * Complete Setup Script
 * 1. Check Ollama installation
 * 2. Install npm dependencies
 * 3. Setup database
 * 4. Download Ollama models
 */

import { execSync, spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { platform } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m"
};

function log(color, ...args) {
  console.log(`${colors[color]}${args.join(" ")}${colors.reset}`);
}

function logSection(num, title) {
  log("cyan", `\n[${num}] ${title}`);
}

async function checkOllama() {
  logSection(1, "Checking Ollama installation...");
  try {
    const version = execSync("ollama --version", { encoding: "utf-8" });
    log("green", `✓ Ollama is installed: ${version.trim()}`);
    return true;
  } catch {
    log("red", "✗ Ollama is not installed");
    log("yellow", "  Attempting automatic installation...");
    return await installOllama();
  }
}

async function installOllama() {
  const osType = platform();
  
  if (osType === "win32") {
    return await installOllamaWindows();
  } else if (osType === "darwin") {
    return await installOllamamacOS();
  } else if (osType === "linux") {
    return await installOllamaLinux();
  } else {
    log("red", "✗ Unsupported OS");
    return false;
  }
}

async function tryPowerShellInstall() {
  try {
    log("gray", "  Method 1: PowerShell install script...");
    execSync(
      'powershell -ExecutionPolicy Bypass -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = \'SilentlyContinue\'; irm https://ollama.com/install.ps1 | iex}"',
      { stdio: "inherit", timeout: 120000 }
    );
    return true;
  } catch (error) {
    log("yellow", `  ⚠ PowerShell method failed: ${error.message}`);
    return false;
  }
}

async function tryWingetInstall() {
  try {
    log("gray", "  Method 2: Winget install...");
    execSync("winget install Ollama.Ollama -y", { stdio: "inherit", timeout: 120000 });
    return true;
  } catch (error) {
    log("yellow", `  ⚠ Winget method failed: ${error.message}`);
    return false;
  }
}

async function tryChocolateyInstall() {
  try {
    log("gray", "  Method 3: Chocolatey install...");
    execSync("choco install ollama -y", { stdio: "inherit", timeout: 120000 });
    return true;
  } catch (error) {
    log("yellow", `  ⚠ Chocolatey method failed: ${error.message}`);
    return false;
  }
}

async function installOllamaWindows() {
  try {
    log("yellow", "  Installing Ollama for Windows...");
    
    // Try multiple installation methods
    const methods = [
      { name: "PowerShell", fn: tryPowerShellInstall },
      { name: "Winget", fn: tryWingetInstall },
      { name: "Chocolatey", fn: tryChocolateyInstall }
    ];
    
    let installed = false;
    for (const method of methods) {
      try {
        if (await method.fn()) {
          log("green", `  ✓ ${method.name} installation succeeded`);
          installed = true;
          break;
        }
      } catch (err) {
        log("yellow", `  ⚠ ${method.name} failed: ${err.message}`);
      }
    }
    
    if (!installed) {
      log("yellow", "\n⚠ All automatic installation methods failed");
      log("yellow", "  Retrying with elevated privileges...\n");
      
      // Try PowerShell again with explicit admin request
      try {
        log("gray", "  Attempting to request administrative elevation...");
        execSync(
          'powershell -Command "Start-Process powershell -Verb RunAs -ArgumentList \'-ExecutionPolicy Bypass -Command \\\"irm https://ollama.com/install.ps1 | iex\\\"\'"',
          { stdio: "inherit", timeout: 30000 }
        );
        installed = true;
      } catch {
        log("yellow", "  ⚠ Administrative elevation attempt failed");
      }
    }
    
    // Wait for installation to complete
    await new Promise(r => setTimeout(r, 3000));
    
    // Verify installation
    try {
      const version = execSync("ollama --version", { encoding: "utf-8", timeout: 10000 });
      log("green", `✓ Ollama installed successfully: ${version.trim()}`);
      return true;
    } catch {
      log("yellow", "⚠ Ollama not verified yet");
      log("yellow", "  Please restart your terminal and run: npm run setup again");
      log("yellow", "\n  If installation still fails, download manually:");
      log("yellow", "  https://ollama.com/download/windows");
      return false;
    }
  } catch (error) {
    log("red", `✗ Installation error: ${error.message}`);
    log("yellow", "\n  Download Ollama manually:");
    log("yellow", "  https://ollama.com/download/windows");
    return false;
  }
}

async function installOllamamacOS() {
  try {
    log("yellow", "  Installing Ollama for macOS...");
    log("gray", "  Running: curl -fsSL https://ollama.com/install.sh | sh");
    
    execSync(
      'curl -fsSL https://ollama.com/install.sh | sh',
      { stdio: "inherit", shell: "/bin/bash" }
    );
    
    // Wait for installation
    await new Promise(r => setTimeout(r, 3000));
    
    // Verify installation
    try {
      const version = execSync("ollama --version", { encoding: "utf-8" });
      log("green", `✓ Ollama installed successfully: ${version.trim()}`);
      return true;
    } catch {
      log("yellow", "⚠ Ollama installation script completed");
      log("yellow", "  Please restart your terminal and run: npm run setup again");
      return false;
    }
  } catch (error) {
    log("red", `✗ Installation failed: ${error.message}`);
    return false;
  }
}

async function installOllamaLinux() {
  try {
    log("yellow", "  Installing Ollama for Linux...");
    log("gray", "  Running: curl -fsSL https://ollama.com/install.sh | sh");
    
    execSync(
      'curl -fsSL https://ollama.com/install.sh | sh',
      { stdio: "inherit", shell: "/bin/bash" }
    );
    
    // Wait for installation
    await new Promise(r => setTimeout(r, 3000));
    
    // Verify installation
    try {
      const version = execSync("ollama --version", { encoding: "utf-8" });
      log("green", `✓ Ollama installed successfully: ${version.trim()}`);
      return true;
    } catch {
      log("yellow", "⚠ Ollama installation script completed");
      log("yellow", "  Please restart your terminal and run: npm run setup again");
      return false;
    }
  } catch (error) {
    log("red", `✗ Installation failed: ${error.message}`);
    return false;
  }
}

async function installDependencies() {
  logSection(2, "Installing npm dependencies...");
  try {
    execSync("npm install", { 
      cwd: projectRoot,
      stdio: "inherit"
    });
    log("green", "✓ npm dependencies installed");
  } catch (error) {
    log("red", "✗ Failed to install dependencies");
    process.exit(1);
  }
}

async function setupDatabase() {
  logSection(3, "Setting up database...");
  
  const dbUrl = "postgres://postgres:postgres@localhost:5432/language_learning";
  const migrationFile = resolve(projectRoot, "server/migrations/001_language_learning_init.sql");
  
  if (!existsSync(migrationFile)) {
    log("yellow", "⚠ Migration file not found, skipping DB setup");
    log("yellow", `  Expected: ${migrationFile}`);
    return;
  }
  
  try {
    // Check if psql is available
    execSync("psql --version", { stdio: "pipe" });
    
    log("yellow", "  Running database migrations...");
    execSync(`psql "${dbUrl}" -f "${migrationFile}"`, {
      stdio: "inherit"
    });
    log("green", "✓ Database setup completed");
  } catch (error) {
    if (error.message.includes("psql")) {
      log("yellow", "⚠ PostgreSQL client (psql) not found");
      log("yellow", "  Install from: https://www.postgresql.org/download/windows/");
      log("yellow", "  Or run manually:");
      log("yellow", `  psql "${dbUrl}" -f "${migrationFile}"`);
    } else {
      log("yellow", "⚠ Database setup skipped or failed");
      log("yellow", "  You can run this manually:");
      log("yellow", `  psql "${dbUrl}" -f "${migrationFile}"`);
    }
  }
}

async function downloadModels() {
  logSection(4, "Downloading Ollama models...");
  
  const models = ["gemma3:4b", "embeddinggemma"];
  
  for (const model of models) {
    try {
      log("yellow", `  Pulling ${model}...`);
      execSync(`ollama pull ${model}`, {
        stdio: "inherit"
      });
      log("green", `  ✓ ${model} downloaded`);
    } catch (error) {
      log("yellow", `  ⚠ Failed to download ${model}`);
    }
  }
}

async function main() {
  log("cyan", "=== Language Learning App - Complete Setup ===");
  
  // Set default environment variables
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:5432/language_learning";
    log("yellow", "[ENV] DATABASE_URL set to default:");
    log("gray", `  ${process.env.DATABASE_URL}`);
  }
  
  if (!process.env.OLLAMA_BASE_URL) {
    process.env.OLLAMA_BASE_URL = "http://127.0.0.1:11434";
  }
  
  if (!process.env.OLLAMA_MODEL) {
    process.env.OLLAMA_MODEL = "gemma3:4b";
  }
  
  if (!process.env.OLLAMA_EMBEDDING_MODEL) {
    process.env.OLLAMA_EMBEDDING_MODEL = "embeddinggemma";
  }
  log("");
  
  const ollamaOk = await checkOllama();
  if (!ollamaOk) {
    log("yellow", "");
    log("yellow", "⚠ Ollama installation or verification failed.");
    log("yellow", "  Please:");
    log("yellow", "  1. Restart your terminal completely (close and reopen)");
    log("yellow", "  2. Run: npm run setup again");
    log("yellow", "");
    log("yellow", "  If that doesn't work, install manually:");
    log("yellow", "  → https://ollama.com/download");
    log("yellow", "");
    process.exit(1);
  }
  
  await installDependencies();
  await setupDatabase();
  await downloadModels();
  
  log("green", "\n✓ Setup completed successfully!");
  log("cyan", "\nNext steps:");
  log("cyan", "  1. Start development environment:");
  log("yellow", "     npm run dev:env");
  log("cyan", "  2. Or start components individually:");
  log("yellow", "     npm run dev:server   # Terminal 1");
  log("yellow", "     npm run dev:frontend # Terminal 2");
  log("cyan", "\nDocumentation:");
  log("yellow", "  See README.md for more details");
}

main().catch((error) => {
  log("red", "Setup failed:", error.message);
  process.exit(1);
});
