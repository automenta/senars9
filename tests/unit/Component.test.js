import Component from '../../core/Component.js';

describe('Component', () => {
  let component;

  beforeEach(() => {
    component = new Component();
  });

  test('should have a default status of "uninitialized"', () => {
    expect(component.getStatus()).toEqual({ status: 'uninitialized' });
  });

  test('initialize should set status to "initialized"', async () => {
    await component.initialize({});
    expect(component.getStatus()).toEqual({ status: 'initialized' });
  });

  test('start should set status to "running"', async () => {
    await component.start();
    expect(component.getStatus()).toEqual({ status: 'running' });
  });

  test('stop should set status to "stopped"', async () => {
    await component.stop();
    expect(component.getStatus()).toEqual({ status: 'stopped' });
  });

  test('destroy should set status to "destroyed"', async () => {
    await component.destroy();
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

  describe('Lifecycle Management', () => {
    test('should provide performance statistics', async () => {
      await component.initialize({});
      const stats = component.getPerformanceStats();

      expect(stats).toHaveProperty('status');
      expect(stats).toHaveProperty('component');
      expect(stats).toHaveProperty('timestamp');
      expect(stats.component).toBe('Component');
    });

    test('should handle errors gracefully during operations', async () => {
      component._doInitialize = () => { throw new Error('Test error'); };

      // Component handles errors internally, so initialize should succeed
      // but the error should be logged through the error handling system
      await component.initialize({});
      expect(component.getStatus().status).toBe('initialized');
    });

    test('should provide health information', () => {
      const health = component.getHealth();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('issues');
      expect(health.status).toBe('healthy');
    });
  });
});