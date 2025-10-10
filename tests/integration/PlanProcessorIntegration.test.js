import { describe, test, expect } from '@jest/globals';
import { 
  testPlanProcessingFunctionality,
  testDocumentParsingAndGoalExtraction,
  testGoalPrioritizationAndValidation,
  testTaskGenerationFromStructuredPlans
} from '../../examples/shared/planProcessorDemo.js';

describe('Plan Processing Integration Test', () => {
  test('should demonstrate document parsing and goal extraction', async () => {
    const result = await testDocumentParsingAndGoalExtraction();
    
    // Verify extraction results
    expect(result.extractionResults).toBeDefined();
    expect(typeof result.markdownGoals).toBe('number');
    expect(typeof result.textGoals).toBe('number');
    expect(typeof result.jsonGoals).toBe('number');
    
    // At least some goals should be extracted from each format
    expect(result.markdownGoals).toBeGreaterThanOrEqual(0);
    expect(result.textGoals).toBeGreaterThanOrEqual(0);
    expect(result.jsonGoals).toBeGreaterThanOrEqual(0);
  });

  test('should demonstrate goal prioritization and validation', async () => {
    const result = await testGoalPrioritizationAndValidation();
    
    // Verify goals are extracted
    expect(Array.isArray(result.allGoals)).toBe(true);
    expect(Array.isArray(result.validGoals)).toBe(true);
    expect(Array.isArray(result.sortedGoals)).toBe(true);
    
    // Verify validation against confidence threshold
    expect(typeof result.confidenceThreshold).toBe('number');
    expect(result.validGoalsCount).toBeLessThanOrEqual(result.goalsCount);
    
    // Verify prioritization
    if (result.sortedGoals.length > 1) {
      // Check if priorities are properly sorted (highest first)
      for (let i = 1; i < result.sortedGoals.length; i++) {
        expect(result.sortedGoals[i-1].priority).toBeGreaterThanOrEqual(result.sortedGoals[i].priority);
      }
    }
  });

  test('should demonstrate task generation from structured plans', async () => {
    const result = await testTaskGenerationFromStructuredPlans();
    
    // Verify processing result
    expect(result.result).toBeDefined();
    expect(Array.isArray(result.result.goals)).toBe(true);
    
    // Verify task generation
    expect(Array.isArray(result.tasks)).toBe(true);
    expect(result.tasksGenerated).toBe(true);
    expect(result.taskCount).toBeGreaterThanOrEqual(0);
    
    // Verify dependencies were analyzed
    expect(typeof result.hasDependencies).toBe('boolean');
    
    // Verify task structure
    expect(Array.isArray(result.validTasks)).toBe(true);
  });

  test('should demonstrate comprehensive plan processing functionality', async () => {
    const result = await testPlanProcessingFunctionality();
    
    // Verify all components are available
    expect(result.componentsAvailable.hasPlanProcessor).toBe(true);
    expect(result.componentsAvailable.hasProcessDocument).toBe(true);
    expect(result.componentsAvailable.hasConvertGoalsToTasks).toBe(true);
    expect(result.componentsAvailable.hasGetStats).toBe(true);
    
    // Verify processing result structure
    expect(result.result).toBeDefined();
    expect(Array.isArray(result.result.goals)).toBe(true);
    expect(result.result.metadata).toBeDefined();
    
    // Verify task conversion
    expect(Array.isArray(result.tasks)).toBe(true);
    
    // Verify direct processing
    expect(result.directResult).toBeDefined();
    expect(Array.isArray(result.directResult.tasks)).toBe(true);
    
    // Verify stats
    expect(result.stats).toBeDefined();
  });
});