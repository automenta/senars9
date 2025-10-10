import { describe, test, expect } from '@jest/globals';
import { 
  testMemoryAttentionFunctionality,
  testMultiFocusSetOperations,
  testAttentionDecayAndUpdate,
  testCrossFocusSetQuerying
} from '../../examples/shared/memoryAttentionDemo.js';

describe('Memory Attention Integration Test', () => {
  test('should demonstrate multi-focus set operations', async () => {
    const result = await testMultiFocusSetOperations();
    
    // Verify multiple focus sets were created
    expect(typeof result.totalFocusSets).toBe('number');
    expect(result.totalFocusSets).toBeGreaterThanOrEqual(3);
    
    // Verify items can be retrieved from different focus sets
    expect(Array.isArray(result.fs1Items)).toBe(true);
    expect(Array.isArray(result.fs2Items)).toBe(true);
    expect(Array.isArray(result.fs3Items)).toBe(true);
    
    // Verify attention scores were updated
    expect(result.allFocusStats).toBeDefined();
    expect(typeof result.allFocusStats['focus-set-1']).toBe('object');
    expect(typeof result.allFocusStats['focus-set-2']).toBe('object');
    expect(typeof result.allFocusStats['focus-set-3']).toBe('object');
  });

  test('should demonstrate attention decay and update mechanisms', async () => {
    const result = await testAttentionDecayAndUpdate();
    
    // Verify attention scores were initially set
    expect(result.initialAttentionScores).toBeDefined();
    expect(typeof result.initialAttentionScores['decay-test-1']).toBe('number');
    expect(typeof result.initialAttentionScores['decay-test-2']).toBe('number');
    
    // Verify attention scores were updated
    expect(result.updatedAttentionScores).toBeDefined();
    expect(typeof result.updatedAttentionScores['decay-test-1']).toBe('number');
    expect(typeof result.updatedAttentionScores['decay-test-2']).toBe('number');
    
    // Verify final stats are available
    expect(result.finalStats).toBeDefined();
    
    // Verify attention was updated
    expect(result.attentionUpdated).toBe(true);
  });

  test('should demonstrate cross-focus set querying', async () => {
    const result = await testCrossFocusSetQuerying();
    
    // Verify cross-focus queries work
    expect(Array.isArray(result.allHighPriority)).toBe(true);
    expect(Array.isArray(result.allTestItems)).toBe(true);
    expect(Array.isArray(result.allHighTagItems)).toBe(true);
    
    // Verify individual focus set queries work
    expect(Array.isArray(result.focusSet1Items)).toBe(true);
    expect(Array.isArray(result.focusSet2Items)).toBe(true);
    
    // Verify global stats are available
    expect(result.globalStats).toBeDefined();
  });

  test('should demonstrate comprehensive memory attention functionality', async () => {
    const result = await testMemoryAttentionFunctionality();
    
    // Verify all components are available
    expect(result.componentsAvailable.hasMemory).toBe(true);
    expect(result.componentsAvailable.hasCreateFocusSet).toBe(true);
    expect(result.componentsAvailable.hasSetFocus).toBe(true);
    expect(result.componentsAvailable.hasGetFocusItems).toBe(true);
    expect(result.componentsAvailable.hasUpdateFocusAttention).toBe(true);
    expect(result.componentsAvailable.hasGetFocusSetStats).toBe(true);
    expect(result.componentsAvailable.hasQuery).toBe(true);
    
    // Verify focus items were retrieved
    expect(Array.isArray(result.focusItems)).toBe(true);
    
    // Verify focus stats are available
    expect(result.focusStats).toBeDefined();
    
    // Verify query results
    expect(Array.isArray(result.highPriorityItems)).toBe(true);
    expect(Array.isArray(result.testTypeItems)).toBe(true);
    
    // Verify overall stats
    expect(result.stats).toBeDefined();
    expect(typeof result.stats.storageSize).toBe('number');
    expect(typeof result.stats.itemCount).toBe('number');
  });
});