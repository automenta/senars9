import { jest } from '@jest/globals';
import createCore from '../../core/createCore.js';
import Rules from '../../core/Rules.js';

describe('Core Foundation Integration Test', () => {
  let core;

  beforeEach(async () => {
    // Create a core instance with a custom component configuration
    core = await createCore({
      components: {
        rules: {
          // Config for the rules engine could go here
        },
      },
    });

    // Register the Rules component, which is not a default component
    core.registerComponent('rules', new Rules());
    // We need to initialize the newly registered component
    await core.rules.initialize(core.config.get('components.rules', {}));
  });

  afterEach(async () => {
    if (core) {
      await core.stop();
      await core.destroy();
    }
  });

  test('should process an input task and derive a new task via the rules engine', async () => {
    // 1. Define a simple rule
    const deductionRule = {
      id: 'deduction-rule-1',
      premises: [{ type: 'belief', pattern: 'A' }],
      conclusion: { type: 'belief', pattern: 'B' },
      apply: (premises) => {
        // When premise 'A' is found, conclude 'B'
        const derivedTask = {
          term: { type: 'belief', name: 'B' },
          punctuation: '.',
          truth: premises[0].truth,
          derivedFrom: [premises[0].id],
        };
        return [derivedTask];
      },
      // Simplified applicability check for the test
      _isApplicable(rule, task) {
        return task.term.type === 'belief' && task.term.name === 'A';
      }
    };

    // Monkey-patch the internal applicability check for this test
    // In a real scenario, the logic would be more robust
    jest.spyOn(core.rules, '_isRuleApplicable').mockImplementation(deductionRule._isApplicable);


    // 2. Add the rule to the engine
    core.rules.addRule(deductionRule);

    // 3. Set up a listener for the output (derived task)
    const derivedTaskHandler = jest.fn();
    core.messages.on('task.derived', derivedTaskHandler);

    // 4. Create a component that listens for input tasks and triggers the reasoner
    const reasoningTrigger = {
      handleInput: (task) => {
        const derivedTasks = core.rules.executeRules([task]);
        for (const derived of derivedTasks) {
          core.messages.emit('task.derived', derived);
        }
      },
    };
    core.messages.on('task.input', reasoningTrigger.handleInput);

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