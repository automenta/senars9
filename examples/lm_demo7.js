/**
 * @file examples/lm_demo7.js
 * @description Demonstrates hybrid reasoning involving both LM and NAL rule applications.
 * This example shows an LM rule decomposing a goal, followed by a NAL rule processing a sub-goal.
 */

import { NAR } from '../core/NAR.js';
import { Logger } from '../core/base/utilities.js';
import DummyProvider from '../core/lm/DummyProvider.js';

// --- Configuration ---
const LOG_LEVEL = 'info';

/**
 * A helper function to print the top tasks in a clear format.
 * @param {NAR} nar - The NAR instance.
 */
function printTopTasks(nar) {
  const tasks = nar.getTasksByPriority().slice(0, 10);
  console.log(`\n--- Top Tasks ---`);
  if (tasks.length === 0) {
    console.log('No tasks in memory.');
    return;
  }
  tasks.forEach((task, i) => {
    console.log(`  ${i + 1}. [P:${task.getPriority().toFixed(2)} C:${task.truth.confidence.toFixed(2)}] ${task.term.toString()}`);
  });
}

/**
 * Main function to run the demonstration.
 */
async function main() {
  Logger.level = LOG_LEVEL;
  Logger.info('--- LM/NAL Hybrid Reasoning Demo 7 ---');

  // 1. Initialize the NAR, which loads all NAL and LM rules automatically.
  const nar = await new NAR().initialize();
  nar.lm.registerProvider('default', new DummyProvider());
  Logger.info(`Using LM provider: DummyProvider`);

  // 2. Input a high-level goal that an LM rule can decompose.
  nar.input('Analyze the market for our new product!');
  Logger.info('\n--- Initial State ---');
  printTopTasks(nar);

  // 3. First reasoning cycle: LM rule decomposes the goal.
  // The GoalDecompositionRule should create a sub-goal like "Sub-goal: Identify competitors".
  Logger.info('\n--- Running Cycle 1 (LM Reasoning) ---');
  await nar.runCycle();
  Logger.info('\n--- State After Cycle 1 ---');
  printTopTasks(nar);

  // 4. Input a belief relevant to the sub-goal.
  // This belief will be used by a NAL rule in the next cycle.
  nar.input('CompetitorA is a competitor.');
  Logger.info('\n--- Inputting New Belief ---');
  printTopTasks(nar);

  // 5. Second reasoning cycle: NAL rule processes the sub-goal and the new belief.
  // A rule like NAL.Deduction should fire, creating a new belief from the sub-goal and the competitor data.
  // (Note: This step is conceptual. The actual output depends on the specific NAL rules implemented).
  Logger.info('\n--- Running Cycle 2 (NAL Reasoning) ---');
  await nar.runCycle();
  Logger.info('\n--- Final State After Cycle 2 ---');
  printTopTasks(nar);

  Logger.info('\n✅ Demo complete. Observe the task list to see the hybrid reasoning results.');
}

main().catch(error => {
  Logger.error('Demo failed:', error);
});