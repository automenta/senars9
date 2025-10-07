import { jest } from '@jest/globals';
import Component from '../../core/Component.js';

describe('Component Base Class', () => {
  describe('Lifecycle and Status', () => {
    let component;
    let config;

    beforeEach(async () => {
      component = new Component();
      config = { name: 'TestComponent' };
      await component.initialize(config);
    });

    test('should initialize with a configuration', () => {
      expect(component.config).toBe(config);
      expect(component.getStatus().status).toBe('initialized');
    });

    test('should transition status on start()', async () => {
      await component.start();
      expect(component.getStatus().status).toBe('running');
    });

    test('should transition status on stop()', async () => {
      await component.start();
      await component.stop();
      expect(component.getStatus().status).toBe('stopped');
    });

    test('should transition status on destroy()', async () => {
      await component.destroy();
      expect(component.getStatus().status).toBe('destroyed');
    });

    test('should return a default health status', () => {
      const health = component.getHealth();
      expect(health).toEqual({
        status: 'healthy',
        issues: [],
      });
    });

    test('should return default metrics', () => {
      const metrics = component.getMetrics();
      expect(metrics).toEqual({});
    });
  });

  describe('Event Handling', () => {
    let component;
    let mockCore;
    let mockMessages;

    beforeEach(async () => {
      mockMessages = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      };
      mockCore = {
        messages: mockMessages,
      };

      component = new Component();
      await component.initialize({});
      component.core = mockCore;
    });

    test('on() should delegate to core.messages.on()', () => {
      const handler = () => {};
      component.on('test.event', handler);
      expect(mockMessages.on).toHaveBeenCalledWith('test.event', handler);
    });

    test('off() should delegate to core.messages.off()', () => {
      const handler = () => {};
      component.off('test.event', handler);
      expect(mockMessages.off).toHaveBeenCalledWith('test.event', handler);
    });

    test('emit() should delegate to core.messages.emit()', () => {
      const data = { payload: 'test' };
      component.emit('test.event', data);
      expect(mockMessages.emit).toHaveBeenCalledWith('test.event', data);
    });

    test('event methods should throw error if core.messages is not available', async () => {
      const plainComponent = new Component();
      await plainComponent.initialize({}); // No core attached
      const handler = () => {};

      expect(() => plainComponent.on('test', handler)).toThrow('Messages component not available on core.');
      expect(() => plainComponent.off('test', handler)).toThrow('Messages component not available on core.');
      expect(() => plainComponent.emit('test', {})).toThrow('Messages component not available on core.');
    });
  });
});