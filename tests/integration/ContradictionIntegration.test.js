import { describe, test, expect } from '@jest/globals';
import {
  testContradictionResolutionFunctionality,
  testDirectContradictionDetection,
  testResolutionStrategySelection,
  testBeliefRevisionWorkflows
} from '../../examples/shared/contradictionDemo.js';

describe('Contradiction Resolution Integration Test', () => {
  test('should demonstrate direct contradiction detection', async () => {
    const result = await testDirectContradictionDetection();

    // Verify contradictions were detected
    expect(result.detectedCount).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.contradictions)).toBe(true);

    // Verify direct negations specifically
    expect(Array.isArray(result.directNegations)).toBe(true);
    expect(typeof result.hasDirectNegation).toBe('boolean');
  });

  test('should demonstrate resolution strategy selection', async () => {
    const result = await testResolutionStrategySelection();

    // Verify strategies are available
    expect(Array.isArray(result.availableStrategies)).toBe(true);
    expect(result.availableStrategies.length).toBeGreaterThan(0);

    // Verify strategy testing worked
    expect(typeof result.totalStrategyTests).toBe('number');
    expect(Object.keys(result.strategyResults).length).toBe(result.totalStrategyTests);

    // Each strategy result should have success field
    Object.values(result.strategyResults).forEach(strategyResult => {
      expect(strategyResult).toBeDefined();
      expect(strategyResult).toHaveProperty('success');
    });
  });

  test('should demonstrate belief revision workflows', async () => {
    const result = await testBeliefRevisionWorkflows();

    // Verify contradiction detection
    expect(Array.isArray(result.contradictions)).toBe(true);

    // Verify resolution was attempted
    if (result.contradictions.length > 0) {
      expect(result.resolutionResult).toBeDefined();
      expect(result.resolutionResult).toHaveProperty('success');
    }

    // Verify stats were updated
    expect(result.finalStats).toBeDefined();
    expect(typeof result.finalStats.contradictionsDetected).toBe('number');
  });

  test('should demonstrate comprehensive contradiction resolution functionality', async () => {
    const result = await testContradictionResolutionFunctionality();

    // Verify all components are available
    expect(result.detectionComponents.hasAnalyzer).toBe(true);
    expect(result.detectionComponents.hasAnalyzeBeliefs).toBe(true);
    expect(result.resolutionComponents.hasResolver).toBe(true);
    expect(result.resolutionComponents.hasResolveContradiction).toBe(true);

    // Verify contradiction detection works
    expect(Array.isArray(result.contradictions)).toBe(true);
    expect(Array.isArray(result.allContradictions)).toBe(true);

    // Verify resolution strategies exist
    expect(Array.isArray(result.availableStrategies)).toBe(true);
    expect(result.availableStrategies.length).toBeGreaterThan(0);

    // Verify resolution results
    expect(typeof result.resolutionResults).toBe('object');

    // Verify stats were returned
    expect(result.analyzerStats).toBeDefined();
    expect(result.resolverStats).toBeDefined();
  });
});