#!/usr/bin/env node

/**
 * Ollama Setup Launcher
 * Detects OS and executes the appropriate setup script
 * Supports: Windows, Linux, macOS
 *
 * NOTE: Ollama and Gemma models are completely free and open source.
 * All processing runs locally on your machine with no cloud charges.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const platform = os.platform();
const scriptDir = path.dirname(__filename);

console.log('=== Ollama Setup Launcher ===\n');
console.log(`Detected OS: ${platform}`);
console.log('');

// Parse command-line arguments
const args = process.argv.slice(2);
const argString = args.join(' ');

try {
  if (platform === 'win32') {
    // Windows: Use PowerShell script
    console.log('[1] Executing Windows setup script...\n');
    const psScript = path.join(scriptDir, 'setup-ollama.ps1');
    
    if (!fs.existsSync(psScript)) {
      console.error(`Error: ${psScript} not found`);
      process.exit(1);
    }
    
    const psCommand = `powershell -ExecutionPolicy Bypass -File "${psScript}" ${argString}`;
    execSync(psCommand, { stdio: 'inherit' });
  } else if (platform === 'linux' || platform === 'darwin') {
    // Linux / macOS: Use Bash script
    console.log(`[1] Executing ${platform === 'darwin' ? 'macOS' : 'Linux'} setup script...\n`);
    const shScript = path.join(scriptDir, 'setup-ollama.sh');
    
    if (!fs.existsSync(shScript)) {
      console.error(`Error: ${shScript} not found`);
      process.exit(1);
    }
    
    // Make script executable
    try {
      execSync(`chmod +x "${shScript}"`);
    } catch (err) {
      // Ignore error if already executable
    }
    
    const shCommand = `bash "${shScript}" ${argString}`;
    execSync(shCommand, { stdio: 'inherit' });
  } else {
    console.error(`Unsupported OS: ${platform}`);
    console.error('Supported platforms: Windows, Linux, macOS');
    process.exit(1);
  }
} catch (error) {
  if (error.code !== null) {
    // Process exited with error code
    process.exit(error.code);
  } else {
    console.error('Setup script execution failed:', error.message);
    process.exit(1);
  }
}
