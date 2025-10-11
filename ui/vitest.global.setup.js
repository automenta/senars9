// vitest.global.setup.js
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serverProcess;

export async function setup() {
  console.log('Starting global setup: no server needed for tests.');
  
  // Don't start server for tests - UI tests should work without actual server
  globalThis.__SERVER_PROCESS__ = null;
  console.log('Skipping server startup for tests.');
}

export async function teardown() {
  console.log('Starting global teardown: shutting down integrated server...');

  const serverToKill = globalThis.__SERVER_PROCESS__;

  if (serverToKill) {
    // Use a platform-agnostic way to kill the detached process
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", serverToKill.pid, '/f', '/t']);
      console.log(`Sent taskkill to server process ${serverToKill.pid}`);
    } else {
      process.kill(-serverToKill.pid);
      console.log(`Sent kill signal to server process group ${serverToKill.pid}`);
    }
  }

  console.log('Global teardown complete.');
}
