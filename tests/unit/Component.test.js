import { jest } from '@jest/globals';
import Component from '../../core/Component.js';
import Messages from '../../core/Messages.js';

describe('Component', () => {
  let component;
  let mockCore;

  beforeEach(() => {
    component = new Component();
    mockCore = {
      messages: new Messages(),
    };
    component.core = mockCore;
  });

  test('should have a default status of "uninitialized"', () => {
    expect(component.getStatus()).toEqual({ status: 'uninitialized' });
  });

  test('initialize should set status to "initialized"', async () => {
    await component.initialize({});
    expect(component.status).toBe('initialized');
    expect(component.getStatus()).toEqual({ status: 'initialized' });
  });

  test('start should set status to "running"', async () => {
    await component.start();
    expect(component.status).toBe('running');
    expect(component.getStatus()).toEqual({ status: 'running' });
  });

  test('stop should set status to "stopped"', async () => {
    await component.stop();
    expect(component.status).toBe('stopped');
    expect(component.getStatus()).toEqual({ status: 'stopped' });
  });

  test('destroy should set status to "destroyed"', async () => {
    await component.destroy();
    expect(component.status).toBe('destroyed');
    expect(component.getStatus()).toEqual({ status: 'destroyed' });
  });

  test('getHealth should return a default healthy status', () => {
    expect(component.getHealth()).toEqual({
      status: 'healthy',
      issues: [],
    });
  });

  test('getMetrics should return an empty object by default', () => {
    expect(component.getMetrics()).toEqual({});
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      // Spy on the messages component methods
      jest.spyOn(mockCore.messages, 'on');
      jest.spyOn(mockCore.messages, 'off');
      jest.spyOn(mockCore.messages, 'emit');
    });

    test('on should register an event handler with the messages system', () => {
      const handler = () => {};
      component.on('test-event', handler);
      expect(mockCore.messages.on).toHaveBeenCalledWith('test-event', handler);
    });

    test('off should unregister an event handler from the messages system', () => {
      const handler = () => {};
      component.off('test-event', handler);
      expect(mockCore.messages.off).toHaveBeenCalledWith('test-event', handler);
    });

    test('emit should emit an event through the messages system', () => {
      const data = { payload: 'test' };
      component.emit('test-event', data);
      expect(mockCore.messages.emit).toHaveBeenCalledWith('test-event', data);
    });

    test('event handling should throw error if core.messages is not available', () => {
      component.core = {}; // No messages component
      const handler = () => {};
      expect(() => component.on('test', handler)).toThrow('Messages component not available on core.');
      expect(() => component.off('test', handler)).toThrow('Messages component not available on core.');
      expect(() => component.emit('test', {})).toThrow('Messages component not available on core.');
    });
  });
});