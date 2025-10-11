import fs from 'fs';
import path from 'path';

console.log('Testing SeNARS UI module structure...\n');

// Test if all required files exist
const requiredFiles = [
  './ui/main.mjs',
  './ui/index.mjs',
  './ui/components/ConnectionTab.mjs',
  './ui/components/ReasonerControlPanel.mjs',
  './ui/components/InputField.mjs',
  './ui/components/LogList.mjs',
  './ui/components/TasksTree.mjs',
  './ui/components/ConceptMap.mjs',
  './core/WebSocketManager.mjs',
  './core/server.mjs',
  './ui/utils/IntegratedServer.mjs'
];

let allFilesExist = true;

for (const file of requiredFiles) {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✓' : '✗'} ${file}`);
  if (!exists) allFilesExist = false;
}

console.log('\nModule structure verification:', allFilesExist ? 'PASSED' : 'FAILED');

if (allFilesExist) {
  console.log('\nAll UI module files are in place and ready for use.');
  console.log('Note: NodeGUI may require system-specific native build steps to run.');
  console.log('To run the UI: npm run ui');
}