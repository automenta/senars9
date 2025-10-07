/**
 * @file: tests/integration/Foundation.test.js
 * @description: Integration tests for the foundational components (Core, Messages, Rules, Memory).
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import createCore from '../../core/createCore.js';

describe('Core Foundation Integration Test', () => {
  let core;

  beforeEach(async () => {
    // createCore now initializes a core with all foundational components
    core = await createCore();
  });

  afterEach(async () => {
    if (core) {
      await core.stop();
      await core.destroy();
    }
  });

  test('should process an input task and derive a new task via the rules engine', async () => {
    // 1. Define a simple rule using the new API
    const deductionRule = {
      name: 'deduction-A-to-B',
      condition: (context) => context.term.name === 'A',
      action: (context) => {
        const derivedTask = {
          term: { type: 'belief', name: 'B' },
          punctuation: '.',
          truth: context.truth,
          derivedFrom: [context.id],
        };
        // The action is responsible for emitting the result
        core.messages.emit('task.derived', derivedTask);
      },
      priority: 10,
    };

    // 2. Add the rule to the engine
    core.rules.add(deductionRule);

    // 3. Set up a listener for the output (derived task)
    const derivedTaskHandler = jest.fn();
    core.messages.on('task.derived', derivedTaskHandler);

    // 4. In a real system, a "Cycle" component would do this.
    // For this test, we'll listen for an input task and trigger the rules engine.
    core.messages.on('task.input', (task) => {
      core.rules.evaluate(task);
    });

    // 5. Input a task that should trigger the rule
    const inputTask = {
      id: 'task-1',
      term: { type: 'belief', name: 'A' },
      punctuation: '.',
      truth: { frequency: 1.0, confidence: 0.9 },
    };
    core.messages.emit('task.input', inputTask);

    // 6. Assert that the rule was triggered and a new task was derived
    expect(derivedTaskHandler).toHaveBeenCalledTimes(1);
    const derivedTask = derivedTaskHandler.mock.calls[0][0];
    expect(derivedTask.term.name).toBe('B');
    expect(derivedTask.derivedFrom).toEqual(['task-1']);
  });
});