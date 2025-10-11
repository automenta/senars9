// vitest.global.setup.js
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serverProcess;

export async function setup() {
  console.log('Starting global setup: launching integrated server...');

  const serverPath = path.resolve(__dirname, './server.js');

  serverProcess = spawn('node', [serverPath], {
    stdio: 'pipe', // Use pipe to capture output
    detached: true, // Detach to manage its lifecycle independently
  });

  // Expose the server process to the teardown function
  globalThis.__SERVER_PROCESS__ = serverProcess;

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Server STDOUT]: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server STDERR]: ${data}`);
  });

  // Give the server a moment to start up.
  // A more robust solution would be to wait for a specific log message.
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('Integrated server should be running.');
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
