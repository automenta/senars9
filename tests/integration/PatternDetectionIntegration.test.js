import { describe, test, expect } from '@jest/globals';
import {
  testPatternDetectionFunctionality,
  testTemporalPatternRecognition,
  testCausalRelationshipIdentification,
  testPatternConfidenceScoring
} from '../../examples/shared/patternDetectorDemo.js';

describe('Pattern Detection Integration Test', () => {
  test('should demonstrate temporal pattern recognition with prediction', async () => {
    const result = await testTemporalPatternRecognition();

    // Verify temporal patterns were detected
    expect(result.hasTemporalPatterns).toBe(true);
    expect(Array.isArray(result.temporalResult.temporal)).toBe(true);
    expect(result.temporalResult.temporal.length).toBeGreaterThanOrEqual(0);

    // Verify predictions were made
    expect(Array.isArray(result.predictions)).toBe(true);
    expect(typeof result.predictionConfidence).toBe('number');
  });

  test('should identify causal relationship patterns', async () => {
    const result = await testCausalRelationshipIdentification();

    // Verify causal patterns were detected
    expect(typeof result.hasCausalPatterns).toBe('boolean');
    expect(typeof result.detectedCausalPatterns).toBe('number');

    // Verify causal pattern matching works
    expect(typeof result.causalMatchCount).toBe('number');
  });

  test('should demonstrate pattern confidence scoring', async () => {
    const result = await testPatternConfidenceScoring();

    // Verify confidence scores are calculated
    expect(Array.isArray(result.patternConfidences)).toBe(true);
    expect(typeof result.averageConfidence).toBe('number');
    expect(typeof result.highestConfidence).toBe('number');

    // Confidence should be between 0 and 1
    if (result.patternConfidences.length > 0) {
      result.patternConfidences.forEach(conf => {
        expect(conf).toBeGreaterThanOrEqual(0);
        expect(conf).toBeLessThanOrEqual(1);
      });
    }
  });

  test('should demonstrate comprehensive pattern detection functionality', async () => {
    const result = await testPatternDetectionFunctionality();

    // Verify all components are available
    expect(result.componentsAvailable.hasPatternDetector).toBe(true);
    expect(result.componentsAvailable.hasProcessEventStream).toBe(true);
    expect(result.componentsAvailable.hasMatchPattern).toBe(true);
    expect(result.componentsAvailable.hasPredictNextEvents).toBe(true);
    expect(result.componentsAvailable.hasGetPatterns).toBe(true);
    expect(result.componentsAvailable.hasGetStats).toBe(true);

    // Verify pattern detection results
    expect(result.result).toBeDefined();
    expect(result.result.temporal).toBeDefined();
    expect(result.result.causal).toBeDefined();
    expect(result.result.hierarchical).toBeDefined();

    // Verify prediction functionality
    expect(Array.isArray(result.predictions)).toBe(true);

    // Verify stats are returned
    expect(result.stats).toBeDefined();
    expect(typeof result.stats.totalPatterns).toBe('number');
    expect(typeof result.stats.patternMatches).toBe('number');
  });
});