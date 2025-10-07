import { jest } from '@jest/globals';
import Self from '../../core/Self.js';

describe('Self Component', () => {
  let self;
  let mockCore;
  let mockMessages;

  beforeEach(async () => {
    // Mock the core and its components that Self interacts with
    mockMessages = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    };
    mockCore = {
      messages: mockMessages,
    };

    self = new Self();
    // We need to attach the mock core before initialization to allow event listeners to be set up
    self.core = mockCore;
    await self.initialize({});
  });

  test('should register event listeners on initialization', () => {
    // It should listen for 'cycle.after' and 'cycle.error'
    expect(mockMessages.on).toHaveBeenCalledWith('cycle.after', expect.any(Function));
    expect(mockMessages.on).toHaveBeenCalledWith('cycle.error', expect.any(Function));
    expect(mockMessages.on).toHaveBeenCalledTimes(2);
  });

  test('should add and run a performance rule', () => {
    const perfRule = {
      id: 'test-rule',
      check: jest.fn(),
    };
    self.addPerformanceRule(perfRule);

    expect(self.getMetrics().performanceRuleCount).toBe(1);

    // This simulates the 'cycle.after' event handler calling runPerformanceChecks
    self.runPerformanceChecks();
    expect(perfRule.check).toHaveBeenCalledWith(mockCore);
  });

  test('should handle cycle completion event', () => {
    // Spy on the method that should be called
    const runChecksSpy = jest.spyOn(self, 'runPerformanceChecks');
    const cycleData = { count: 1 };

    self.handleCycleCompletion(cycleData);
    expect(runChecksSpy).toHaveBeenCalled();

    runChecksSpy.mockRestore();
  });

  test('should handle cycle error event', () => {
    // Spy on console.error to check if it's called
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const errorData = { error: new Error('Test Error') };

    self.handleCycleError(errorData);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Self-monitoring detected a cycle error:', errorData.error);

    consoleErrorSpy.mockRestore();
  });

  test('should throw an error if performance rule has no ID', () => {
    expect(() => {
      self.addPerformanceRule({ name: 'invalid rule' });
    }).toThrow('Performance rule must have an ID.');
  });
});