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

  try {
    // Check if server is already running on port 8080
    const net = await import('net');
    const testPort = new Promise((resolve) => {
      const tester = net
        .createServer()
        .once('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.log('Port 8080 already in use, assuming server is running');
            resolve(false); // Already in use
          } else {
            resolve(true); // Not in use
          }
        })
        .once('listening', () => {
          tester.close();
          resolve(true); // Port is available
        })
        .listen(8080, 'localhost');
    });

    if (await testPort) {
      // Port is available, start the server
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

      // Give the server a moment to start up
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('Integrated server started.');
    } else {
      console.log('Integrated server already running.');
      globalThis.__SERVER_PROCESS__ = null;
    }
  } catch (error) {
    console.log('Error checking port or starting server:', error.message);
  }
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
