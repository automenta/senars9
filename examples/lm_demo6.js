/**
 * @file examples/lm_demo6.js
 * @description Demonstrates the refactored LM-based reasoning API with automatic rule loading and provider switching.
 */

import { NAR } from '../core/NAR.js';
import { Punctuation } from '../core/Task.js';
import { Term } from '../core/Term.js';
import { Logger } from '../core/base/utilities.js';
import DummyProvider from '../core/lm/DummyProvider.js';
import XenovaProvider from '../core/lm/XenovaProvider.js';
// --- Configuration ---
const USE_DUMMY_PROVIDER = true; // Set to false to use XenovaProvider
const LOG_LEVEL = 'info';

/**
 * Main function to run the demo.
 */
async function main() {
  Logger.level = LOG_LEVEL;
  Logger.info('--- LM Reasoning Demo 6: Refactored API ---');

  // 1. Initialize the NAR
  const nar = await new NAR().initialize();

  // 2. Configure and register LM providers
  const dummyProvider = new DummyProvider();
  const xenovaProvider = new XenovaProvider({
    modelName: 'Xenova/distilgpt2',
    device: 'webgpu',
  });

  const providerId = USE_DUMMY_PROVIDER ? 'dummy' : 'xenova';
  const provider = USE_DUMMY_PROVIDER ? dummyProvider : xenovaProvider;

  nar.lm.registerProvider(providerId, provider);
  nar.lm.defaultProviderId = providerId;

  Logger.info(`Using LM provider: ${providerId}`);

  // 3. Input a high-level goal
  const goalTerm = Term.newAtom('create a comprehensive marketing plan for a new product!');
  const goal = nar.input({
    term: goalTerm,
    punctuation: Punctuation.GOAL,
    priority: 0.9,
  });

  Logger.info(`Input goal: ${goal.toString()}`);

  // 5. Run the reasoning cycle to process the goal
  Logger.info('\n--- Running Reasoning Cycle ---');
  await nar.runCycle();

  // 6. Observe the results
  Logger.info('\n--- Observing Results ---');
  const allTasks = nar.getTasksByPriority();

  console.log(`\nTotal tasks in memory: ${allTasks.length}`);
  console.log('Top 5 tasks by priority:');
  allTasks.slice(0, 5).forEach((task, i) => {
    console.log(`  ${i + 1}. [${task.getPriority().toFixed(2)}] ${task.toString()}`);
  });

  const subGoals = allTasks.filter(task =>
    task.term.toString().includes('Sub-goal')
  );

  if (subGoals.length > 0) {
    Logger.info(`\nSuccessfully decomposed goal into ${subGoals.length} sub-goals!`);
  } else {
    Logger.error('\nFailed to decompose goal into sub-goals.');
  }
}

main().catch(error => {
  Logger.error('Demo failed:', error);
});