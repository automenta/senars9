import { describe, test, expect } from '@jest/globals';
import {
  testBootstrapAgentFunctionality,
  testPlanFileMonitoringAndUpdates,
  testSelfDirectedGoalProcessing,
  testImprovementLoopIteration
} from '../../examples/shared/bootstrapDemo.js';

describe('Bootstrap Agent Integration Test', () => {
  test('should demonstrate plan file monitoring and updates', async () => {
    const result = await testPlanFileMonitoringAndUpdates();

    // Verify initial and final stats
    expect(result.initialStats).toBeDefined();
    expect(result.finalStats).toBeDefined();

    // Verify cycle results
    expect(Array.isArray(result.cycleResults)).toBe(true);

    // Verify plan sources were added
    expect(typeof result.planSourcesCount).toBe('number');
    expect(result.planSourcesCount).toBeGreaterThanOrEqual(1);
  });

  test('should demonstrate self-directed goal processing', async () => {
    const result = await testSelfDirectedGoalProcessing();

    // Verify execution results
    expect(Array.isArray(result.executionResults)).toBe(true);

    // Verify final stats and status
    expect(result.finalStats).toBeDefined();
    expect(result.finalStatus).toBeDefined();

    // Verify goal processing
    expect(typeof result.totalGoals).toBe('number');
    expect(typeof result.completedGoals).toBe('number');

    // Verify self-improvement was enabled
    expect(result.selfImprovementEnabled).toBe(true);
  });

  test('should demonstrate improvement loop iteration', async () => {
    const result = await testImprovementLoopIteration();

    // Verify iteration results
    expect(Array.isArray(result.iterationResults)).toBe(true);

    // Verify metrics
    expect(typeof result.bootstrapIterations).toBe('number');
    expect(typeof result.selfImprovements).toBe('number');
    expect(typeof result.goalsProcessed).toBe('number');
    expect(typeof result.goalsCompleted).toBe('number');

    // Verify improvement loop was enabled
    expect(result.improvementLoopEnabled).toBe(true);
  });

  test('should demonstrate comprehensive bootstrap agent functionality', async () => {
    const result = await testBootstrapAgentFunctionality();

    // Verify all components are available
    expect(result.componentsAvailable.hasBootstrapAgent).toBe(true);
    expect(result.componentsAvailable.hasInitialize).toBe(true);
    expect(result.componentsAvailable.hasSetupDependencies).toBe(true);
    expect(result.componentsAvailable.hasStart).toBe(true);
    expect(result.componentsAvailable.hasStop).toBe(true);
    expect(result.componentsAvailable.hasExecuteSingleCycle).toBe(true);
    expect(result.componentsAvailable.hasAddPlanSource).toBe(true);

    // Verify test goal was added
    expect(result.testGoal).toBeDefined();
    expect(result.testGoal).toHaveProperty('text');

    // Verify cycle execution
    expect(result.cycleResult).toBeDefined();

    // Verify stats and status
    expect(result.stats).toBeDefined();
    expect(result.status).toBeDefined();
  });
});