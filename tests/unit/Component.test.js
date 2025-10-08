import Component from '../../core/Component.js';

const createTestComponent = (overrides = {}) => {
  class TestComponent extends Component {
    constructor() {
      super();
      this.errorTriggered = false;
      this.initializeError = null;
      this.startError = null;
      this.stopError = null;
      this.destroyError = null;
    }

    _doInitialize = async (config) => {
      if (this.initializeError) throw this.initializeError;
      Object.assign(this, overrides);
    };

    _doStart = async () => {
      if (this.startError) throw this.startError;
    };

    _doStop = async () => {
      if (this.stopError) throw this.stopError;
    };

    _doDestroy = async () => {
      if (this.destroyError) throw this.destroyError;
    };

    triggerError = (phase, error) => {
      this[`${phase}Error`] = error;
    };
  }

  return new TestComponent();
};

describe('Component', () => {
  const statusTransitions = [
    { method: 'initialize', from: 'uninitialized', to: 'initialized', args: [{}] },
    { method: 'start', from: 'initialized', to: 'running', args: [] },
    { method: 'stop', from: 'running', to: 'stopped', args: [] },
    { method: 'destroy', from: 'stopped', to: 'destroyed', args: [] },
  ];

  statusTransitions.forEach(({ method, from, to, args }) => {
    test(`${method} should transition from ${from} to ${to}`, async () => {
      const component = createTestComponent();

      // Navigate to the 'from' state
      for (const transition of statusTransitions) {
        if (transition.method === method) break;
        await component[transition.method](...(transition.args || [{}]));
      }

      await component[method](...args);
      expect(component.getStatus().status).toBe(to);
    });
  });

  test('should provide default health status', () => {
    const component = createTestComponent();
    const health = component.getHealth();

    expect(health).toEqual({
      status: 'healthy',
      issues: [],
    });
  });

  test('should provide empty metrics by default', () => {
    const component = createTestComponent();
    expect(component.getMetrics()).toEqual({});
  });

  test('should provide performance statistics', async () => {
    const component = createTestComponent();
    await component.initialize({});

    const stats = component.getPerformanceStats();
    expect(stats).toHaveProperty('status');
    expect(stats).toHaveProperty('component');
    expect(stats).toHaveProperty('timestamp');
    expect(stats.component).toBe('TestComponent');
  });

  test('should handle errors gracefully during operations', async () => {
    const component = createTestComponent();
    const testError = new Error('Test error');

    component.triggerError('initialize', testError);

    await component.initialize({});
    expect(component.getStatus().status).toBe('initialized');
  });

  test('should provide health information', () => {
    const component = createTestComponent();
    const health = component.getHealth();

    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('issues');
    expect(health.status).toBe('healthy');
  });
});