import { jest } from '@jest/globals';
import System from '../../core/System.js';
import Core from '../../core/Core.js';

describe('System', () => {
  let system;

  beforeEach(() => {
    // We instantiate the system but don't start it yet.
    system = new System({ app: 'test' });
  });

  afterEach(async () => {
    // Ensure system is stopped if it was started during a test.
    if (system && system.core) {
      await system.stop();
    }
  });

  describe('Lifecycle Management', () => {
    test('start should create and start a core instance', async () => {
      // Spies to ensure the core lifecycle methods are called.
      const startSpy = jest.spyOn(Core.prototype, 'start');
      const initializeSpy = jest.spyOn(Core.prototype, 'initialize');

      await system.start();

      expect(system.core).toBeInstanceOf(Core);
      expect(initializeSpy).toHaveBeenCalledWith({ app: 'test' });
      expect(startSpy).toHaveBeenCalled();

      startSpy.mockRestore();
      initializeSpy.mockRestore();
    });

    test('start should warn if called when already running', async () => {
      await system.start(); // First start
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const coreInstance = system.core;
      const startSpy = jest.spyOn(coreInstance, 'start');

      await system.start(); // Second start

      expect(warnSpy).toHaveBeenCalledWith('[WARN]', 'System: System is already running.', {});
      // start() should not have been called a second time.
      expect(startSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
      startSpy.mockRestore();
    });

    test('stop should stop and destroy the core, then nullify it', async () => {
      await system.start();
      const coreInstance = system.core;

      const stopSpy = jest.spyOn(coreInstance, 'stop');
      const destroySpy = jest.spyOn(coreInstance, 'destroy');

      await system.stop();

      expect(stopSpy).toHaveBeenCalled();
      expect(destroySpy).toHaveBeenCalled();
      expect(system.core).toBeNull();

      stopSpy.mockRestore();
      destroySpy.mockRestore();
    });
  });

  describe('Input and Event Handling', () => {
    beforeEach(async () => {
      // Ensure the system is running for these tests.
      await system.start();
    });

    test('input should emit a "task.input" event on the messages component', () => {
      const emitSpy = jest.spyOn(system.core.messages, 'emit');
      const task = { term: 'test belief', type: 'belief' };
      system.input(task);

      // Check that the event was called and the task was enhanced with default values
      expect(emitSpy).toHaveBeenCalledWith('task.input', expect.objectContaining({
        term: 'test belief',
        type: 'belief',
        priority: 0.5,
        punctuation: '.',
        truth: { frequency: 1.0, confidence: 0.9 }
      }));
      emitSpy.mockRestore();
    });

    test('input should throw an error if the system is not running', async () => {
      await system.stop(); // Stop the system first
      expect(() => system.input({})).toThrow('System: System is not running. Call start() before inputting tasks.');
    });

    test('on should register an event handler on the messages component', () => {
      const onSpy = jest.spyOn(system.core.messages, 'on');
      const handler = () => {};
      system.on('test-event', handler);
      // The handler gets wrapped, so we just check that on was called with the event name
      expect(onSpy).toHaveBeenCalledWith('test-event', expect.any(Function));
      onSpy.mockRestore();
    });

    test('off should unregister an event handler from the messages component', () => {
      const offSpy = jest.spyOn(system.core.messages, 'off');
      const handler = () => {};
      system.off('test-event', handler);
      // The handler doesn't exist in the map, so off should not be called
      expect(offSpy).not.toHaveBeenCalled();
      offSpy.mockRestore();
    });
  });
});