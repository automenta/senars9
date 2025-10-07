import { jest } from '@jest/globals';
import Cycle from '../../core/Cycle.js';

describe('Cycle Component', () => {
  let cycle;
  let mockCore;
  let mockMemory;
  let mockReasoning;
  let mockMessages;

  beforeEach(async () => {
    jest.useFakeTimers();

    mockMemory = {
      queryTasks: jest.fn(async () => [{ id: 'task1' }]),
    };
    mockReasoning = {
      reason: jest.fn(async () => []),
    };
    mockMessages = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    };
    mockCore = {
      memory: mockMemory,
      reasoning: mockReasoning,
      messages: mockMessages,
    };

    cycle = new Cycle();
    await cycle.initialize({ intervalMs: 100 });
    cycle.core = mockCore;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should initialize with a default interval', async () => {
    const newCycle = new Cycle();
    await newCycle.initialize();
    expect(newCycle.config.intervalMs).toBe(1000);
  });

  test('start() should begin the cycle and emit an event', async () => {
    await cycle.start();
    expect(cycle.isCycling).toBe(true);
    expect(cycle.cycleTimer).not.toBeNull();
    // The second argument is undefined when no data is passed to emit()
    expect(mockMessages.emit).toHaveBeenCalledWith('cycle.started', undefined);
  });

  test('stop() should end the cycle and emit an event', async () => {
    await cycle.start();
    await cycle.stop();
    expect(cycle.isCycling).toBe(false);
    expect(cycle.cycleTimer).toBeNull();
    // The second argument is undefined when no data is passed to emit()
    expect(mockMessages.emit).toHaveBeenCalledWith('cycle.stopped', undefined);
  });

  test('should run a cycle periodically', async () => {
    await cycle.start();
    expect(cycle.cycleCount).toBe(0);

    jest.advanceTimersByTime(100); // Advance time by one interval
    expect(cycle.cycleCount).toBe(1);

    jest.advanceTimersByTime(200); // Advance time by two more intervals
    expect(cycle.cycleCount).toBe(3);
  });

  test('run() should select a focus set and perform reasoning', async () => {
    await cycle.run();

    expect(mockMemory.queryTasks).toHaveBeenCalled();
    expect(mockReasoning.reason).toHaveBeenCalledWith([{ id: 'task1' }]);
  });

  test('run() should emit before and after events', async () => {
    await cycle.run();
    expect(mockMessages.emit).toHaveBeenCalledWith('cycle.before', { count: 1 });
    expect(mockMessages.emit).toHaveBeenCalledWith('cycle.after', { count: 1 });
  });

  test('run() should handle and emit errors', async () => {
    // Mock console.error to prevent logging during this test
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('Reasoning failed');
    mockReasoning.reason.mockRejectedValue(error);

    await cycle.run();
    expect(mockMessages.emit).toHaveBeenCalledWith('cycle.error', { error });

    // Restore original console.error
    consoleErrorSpy.mockRestore();
  });

  test('should return correct metrics', async () => {
    await cycle.start();
    jest.advanceTimersByTime(300);

    const metrics = cycle.getMetrics();
    expect(metrics).toEqual({
      isCycling: true,
      cycleCount: 3,
      intervalMs: 100,
    });
  });
});