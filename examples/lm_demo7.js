/**
 * @file examples/lm_demo7.js
 * @description A comprehensive demonstration of the refactored NAR system's LM-based reasoning capabilities.
 * This example showcases simplified provider setup, automatic rule loading, goal decomposition,
 * and a provider switch for easy testing with different backends.
 */

import { NAR } from '../core/NAR.js';
import { Logger } from '../core/base/utilities.js';
import DummyProvider from '../core/lm/DummyProvider.js';
import XenovaProvider from '../core/lm/XenovaProvider.js';
import LangChainProvider from '../core/lm/LangChainProvider.js';

// --- Configuration ---
const PROVIDER_TYPE = 'dummy'; // 'dummy', 'xenova', or 'langchain'
const LOG_LEVEL = 'info';

/**
 * A helper function to print the top tasks in a clear format.
 * @param {NAR} nar - The NAR instance.
 * @param {number} count - The number of top tasks to print.
 */
function printTopTasks(nar, count = 5) {
  const tasks = nar.getTasksByPriority().slice(0, count);
  console.log(`\n--- Top ${count} Tasks ---`);
  if (tasks.length === 0) {
    console.log('No tasks in memory.');
    return;
  }
  tasks.forEach((task, i) => {
    console.log(`  ${i + 1}. [P:${task.getPriority().toFixed(2)} C:${task.truth.confidence.toFixed(2)}] ${task.term.toString()}`);
  });
}

/**
 * Factory function to create the appropriate LM provider based on the configuration.
 * @returns {object} An instance of an LM provider.
 */
function createProvider() {
  switch (PROVIDER_TYPE) {
    case 'xenova':
      Logger.info('Using XenovaProvider. This may take a moment to initialize...');
      return new XenovaProvider({ modelName: 'Xenova/distilgpt2', device: 'webgpu' });
    case 'langchain':
      Logger.info('Using LangChainProvider for local Ollama.');
      return new LangChainProvider({
        modelName: 'mistral', // Ensure you have 'mistral' model pulled in Ollama
        baseURL: 'http://localhost:11434/v1',
        apiKey: 'ollama', // API key is often not required for local Ollama
      });
    case 'dummy':
    default:
      Logger.info('Using DummyProvider.');
      return new DummyProvider();
  }
}

/**
 * Main function to run the demonstration.
 */
async function main() {
  Logger.level = LOG_LEVEL;
  Logger.info('--- LM Reasoning Demo 7: Refactored API ---');

  // 1. Initialize the NAR. Rules are automatically loaded.
  const nar = await new NAR().initialize();

  // 2. Create and register the desired LM provider using the factory.
  const provider = createProvider();
  nar.lm.registerProvider('default', provider);
  Logger.info(`Registered LM provider: ${provider.constructor.name}`);

  // 3. Input a high-level goal.
  const goal = nar.input('Develop a marketing strategy for a new AI-powered productivity app!');
  Logger.info(`Input goal: ${goal.term.toString()}`);

  // 4. Run the reasoning cycle to process the goal.
  Logger.info('\n--- Running Reasoning Cycle ---');
  await nar.runCycle();

  // 5. Observe the results.
  Logger.info('\n--- Observing Results ---');
  printTopTasks(nar, 10);

  const subGoals = nar.getTasks().filter(task => task.term.toString().toLowerCase().includes('sub-goal'));

  if (subGoals.length > 0) {
    Logger.info(`\n✅ Successfully decomposed the main goal into ${subGoals.length} sub-goals.`);
  } else {
    Logger.error('\n❌ Failed to decompose the goal. Check the LM provider and its output.');
  }
}

main().catch(error => {
  Logger.error('Demo failed:', error);
});