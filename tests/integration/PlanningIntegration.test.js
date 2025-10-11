import { describe, test, expect } from '@jest/globals';
import { testPlanningFunctionality, testTaskDependencyResolution } from '../../examples/shared/planningDemo.js';

describe('Planning Integration Test', () => {
  test('should demonstrate HTN plan generation and execution', async () => {
    const result = await testPlanningFunctionality();

    // Verify planner components are available
    expect(result.componentsAvailable.hasPlanner).toBe(true);
    expect(result.componentsAvailable.hasRegisterMethod).toBe(true);
    expect(result.componentsAvailable.hasRegisterOperator).toBe(true);
    expect(result.componentsAvailable.hasPlan).toBe(true);
    expect(result.componentsAvailable.hasExecutePlan).toBe(true);

    // Verify a plan was generated
    expect(result.plan).toBeDefined();
    expect(Array.isArray(result.plan)).toBe(true);

    // Verify execution result
    expect(result.executionResult).toBeDefined();
    expect(result.executionResult.success).toBe(true);
    expect(Array.isArray(result.executionResult.executedTasks)).toBe(true);
  });

  test('should resolve task dependency relationships correctly', async () => {
    const result = await testTaskDependencyResolution();

    // Verify plan was generated with dependencies
    expect(result.plan).toBeDefined();
    expect(Array.isArray(result.plan)).toBe(true);
    expect(result.plan.length).toBeGreaterThan(0);

    // Verify dependencies were resolved during execution
    expect(result.dependenciesResolved).toBe(true);
    expect(result.executionResult).toBeDefined();
    expect(result.executionResult.success).toBe(true);
  });

  test('should demonstrate plan failure recovery strategies', async () => {
    const System = (await import('../../core/system/System.js')).default;
    const testSystem = new System({});

    try {
      await testSystem.start();

      const planner = testSystem.core.htnPlanner;
      if (!planner) {
        throw new Error('HTN Planner not available');
      }

      // Register a method that may fail
      planner.registerMethod('risky-task', async (task, context) => {
        // This method might fail based on conditions
        if (context.riskFactor > 0.8) {
          // Return a plan that will fail
          return [
            { name: 'risky-action' }
          ];
        }
        // Otherwise return a safe plan
        return [
          { name: 'safe-action' }
        ];
      });

      // Register operators
      planner.registerOperator('risky-action', async (task, context) => {
        // Simulate failure
        if (Math.random() > 0.5) {
          throw new Error('Risky action failed');
        }
        return {
          success: true,
          message: 'Risky action completed safely',
          effects: { riskyActionCompleted: true }
        };
      });

      planner.registerOperator('safe-action', async (task, context) => {
        return {
          success: true,
          message: 'Safe action completed',
          effects: { safeActionCompleted: true }
        };
      });

      // Test with high risk factor which may cause failure
      const riskyGoal = { name: 'risky-task' };
      const riskyStartState = { riskFactor: 0.9 };

      const riskyPlan = await planner.createGoalPlan(riskyGoal, riskyStartState);
      expect(riskyPlan).toBeDefined();

      // Execution might fail but should be handled gracefully
      const riskyResult = await planner.executePlan(riskyPlan, {
        ...riskyStartState,
        startTime: Date.now()
      });

      // The planner should handle failures appropriately
      expect(riskyResult).toBeDefined();

    } finally {
      await testSystem.stop();
    }
  });

  test('should verify planner statistics and metrics', async () => {
    const result = await testPlanningFunctionality();

    // Verify stats are returned and contain expected properties
    expect(result.stats).toBeDefined();
    expect(typeof result.stats.registeredMethods).toBe('number');
    expect(typeof result.stats.registeredOperators).toBe('number');
    expect(typeof result.stats.methodsApplied).toBe('number');
    expect(typeof result.stats.backtracks).toBe('number');
    expect(typeof result.stats.averagePlanLength).toBe('number');
    expect(typeof result.stats.plansGenerated).toBe('number');
    expect(typeof result.stats.plansExecuted).toBe('number');
  });
});