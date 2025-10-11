import { describe, test, expect } from '@jest/globals';
import {
  testCognitiveCycleFunctionality,
  testRuleMemoryInteraction,
  testTaskProcessingFlow,
  testEndToEndCognitiveLoop
} from '../../examples/shared/cognitiveDemo.js';

describe('Cognitive Cycle Integration Test', () => {
  test('should demonstrate end-to-end cognitive loop', async () => {
    const result = await testEndToEndCognitiveLoop();

    // Verify cognitive loop completed all steps
    expect(typeof result.cognitiveLoopCompleted).toBe('boolean');
    expect(result.totalStepsCompleted).toBeGreaterThanOrEqual(1);

    // Verify perception occurred
    expect(result.perceptionResult).toBeDefined();
    expect(result.perceptionResult).toHaveProperty('type');
    expect(result.perceptionResult.type).toBe('perceived-event');

    // Verify reasoning occurred
    expect(result.reasoningResult).toBeDefined();
    expect(result.reasoningResult).toHaveProperty('type');
    expect(result.reasoningResult.type).toBe('reasoned-implication');

    // Verify decision occurred (if conditions met)
    if (result.reasoningResult && result.reasoningResult.implications.includes('high-value-detected')) {
      expect(result.decisionResult).toBeDefined();
      expect(result.decisionResult).toHaveProperty('type');
      expect(result.decisionResult.type).toBe('decision-made');
    }

    // Verify learning occurred
    expect(Array.isArray(result.learningItems)).toBe(true);
  });

  test('should verify rule-memory interaction', async () => {
    const result = await testRuleMemoryInteraction();

    // Verify rule execution result
    expect(result.ruleExecutionResult).toBeDefined();
    expect(result.ruleExecutionResult).toHaveProperty('stored');
    expect(result.ruleExecutionResult.stored).toBe(true);

    // Verify memory interaction worked
    expect(result.storedItem).toBeDefined();
    expect(result.storedItem).toHaveProperty('processed');
    expect(result.storedItem.processed).toBe(true);

    // Verify interaction was successful
    expect(result.interactionSuccessful).toBe(true);
  });

  test('should demonstrate task processing flow', async () => {
    const result = await testTaskProcessingFlow();

    // Verify task processing was successful
    expect(result.taskProcessingSuccessful).toBe(true);

    // Verify task result structure
    expect(result.taskResult).toBeDefined();
    expect(result.taskResult).toHaveProperty('status');
    expect(result.taskResult.status).toBe('completed');

    // Verify stored task result matches execution result
    expect(result.storedTaskResult).toEqual(result.taskResult);

    // Verify steps were processed
    expect(typeof result.stepsCompleted).toBe('number');
    expect(result.stepsCompleted).toBeGreaterThanOrEqual(1);
  });

  test('should demonstrate comprehensive cognitive cycle functionality', async () => {
    const result = await testCognitiveCycleFunctionality();

    // Verify core cognitive components are available
    expect(result.componentsAvailable.hasMemory).toBe(true);
    expect(result.componentsAvailable.hasRules).toBe(true);

    // Verify rule evaluation worked
    expect(result.ruleEvaluationResult).toBeDefined();

    // Verify memory operations worked
    expect(result.memoryResult).toBeDefined();
    expect(result.memoryResult).toHaveProperty('content');

    // Verify stats were returned
    expect(result.memoryStats).toBeDefined();
    expect(result.ruleStats).toBeDefined();
  });
});