/**
 * @file tests/reasoning/TestNAR.test.js
 * @description Test that the TestNAR class works as expected.
 */

import { test, expect } from '@jest/globals';
import { TestNAR } from './TestNAR.js';

test('TestNAR should initialize without rules for testing', async () => {
  const testNAR = await new TestNAR().initialize();
  
  // Should have no rules initially to allow individual rule testing
  expect(testNAR.reasoner.rules.size).toBe(0);
  expect(testNAR.reasoner.getEnabledRules().length).toBe(0);
  
  // Should have basic NAR functionality
  expect(testNAR.memory).toBeDefined();
  expect(testNAR.reasoner).toBeDefined();
  expect(testNAR.focus).toBeDefined();
  
  // Should be able to add tasks (but they are stored in the input queue)
  testNAR.input('Test task.');
  expect(testNAR.inputs.length).toBe(1);
});

test('TestNAR should provide fluent testing methods', async () => {
  const testNAR = await new TestNAR().initialize();
  
  // Test fluent methods
  testNAR.belief('Test belief', { frequency: 0.8, confidence: 0.9 })
         .goal('Test goal', { frequency: 0.7, confidence: 0.8 })
         .question('Test question');
  
  // Should have 3 inputs in the queue
  expect(testNAR.inputs.length).toBe(3);
  
  // Should return this for chaining
  expect(testNAR.run(1)).toBe(testNAR);
});

test('TestNAR should provide expectation methods', async () => {
  const testNAR = await new TestNAR().initialize();
  
  // Add a belief and expect it after running
  await testNAR.belief('A specific test term appears here')
               .run(1)
               .execute();
  
  // Check if term exists after execution
  const exists = testNAR._findMatchingTasks({ term: 'specific test term' });
  expect(exists.length).toBeGreaterThan(0);
});

test('TestNAR should execute inputs and run cycles', async () => {
  const testNAR = await new TestNAR().initialize();
  
  // Record a sequence of operations
  const result = await testNAR.belief('Initial belief')
                              .run(1)
                              .expect({ term: 'Initial belief' })
                              .execute();
  
  // Should have executed successfully
  expect(result).toBeDefined();
  expect(result.passed).toBe(true);
  expect(result.expectations).toBe(1);
});

test('TestNAR should allow positive and negative expectations', async () => {
  const testNAR = await new TestNAR().initialize();
  
  // Test positive expectation (should exist)
  const result1 = await testNAR.belief('Positive test')
                               .run(1)
                               .expect({ term: 'Positive test' })
                               .execute();
  
  expect(result1.passed).toBe(true);
  
  // Test negative expectation (should not exist)
  const result2 = await testNAR.belief('Another belief')
                               .run(1)
                               .expectNot({ term: 'Non-existent term' })
                               .execute();
  
  expect(result2.passed).toBe(true);
});