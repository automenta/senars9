import createCore from '../../core/createCore.js';
import Component from '../../core/Component.js';

export const createCoreWithLifecycle = async (config = {}) => {
  const core = await createCore(config);
  return {
    core,
    async cleanup() {
      await core.stop();
      await core.destroy();
    }
  };
};

export const withCoreLifecycle = (testFn) => {
  return async () => {
    const { core, cleanup } = await createCoreWithLifecycle();
    try {
      await testFn(core);
    } finally {
      await cleanup();
    }
  };
};

export const createTestComponent = (overrides = {}) => {
  class TestComponent extends Component {
    constructor() {
      super();
      this.errorTriggered = false;
      this.initializeError = null;
      this.startError = null;
      this.stopError = null;
      this.destroyError = null;
      this.customProps = {};
    }

    _doInitialize = async (config) => {
      if (this.initializeError) throw this.initializeError;
      Object.assign(this.customProps, overrides);
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

export const lifecycleTransitions = [
  { method: 'initialize', from: 'uninitialized', to: 'initialized', args: [{}] },
  { method: 'start', from: 'initialized', to: 'running', args: [] },
  { method: 'stop', from: 'running', to: 'stopped', args: [] },
  { method: 'destroy', from: 'stopped', to: 'destroyed', args: [] },
];

export const testLifecycleTransitions = (componentFactory) => {
  lifecycleTransitions.forEach(({ method, from, to, args }) => {
    test(`${method} should transition from ${from} to ${to}`, async () => {
      const component = componentFactory();

      // Navigate to the 'from' state
      for (const transition of lifecycleTransitions) {
        if (transition.method === method) break;
        await component[transition.method](...(transition.args || [{}]));
      }

      await component[method](...args);
      expect(component.getStatus().status).toBe(to);
    });
  });
};

export const createTestData = {
  tasks: {
    simple: { content: 'test task', priority: 5 },
    urgent: { content: 'urgent task', priority: 10 },
    low: { content: 'low priority task', priority: 1 },
  },

  rules: {
    simple: {
      name: 'test-rule',
      condition: (ctx) => ctx?.term?.name === 'A',
      action: (ctx) => ({ result: 'B' }),
      priority: 5
    },
    complex: {
      name: 'complex-rule',
      type: 'inference',
      complexity: 'complex',
      condition: (ctx) => ctx?.priority > 5,
      action: (ctx) => ({ result: 'high-priority' }),
      priority: 8
    }
  },

  memoryItems: {
    alert: {
      key: 'alert-1',
      value: { content: 'system alert', type: 'alert' },
      options: { type: 'alert', tags: ['system'], priority: 10 }
    },
    task: {
      key: 'task-1',
      value: { content: 'scheduled task', type: 'task' },
      options: { type: 'task', tags: ['scheduled'], priority: 5 }
    }
  }
};

export const performanceThresholds = {
  ruleEvaluation: 50,
  memoryOperation: 10,
  componentLifecycle: 100,
  bulkOperation: 1000,
};

export const measurePerformance = async (operation) => {
  const start = Date.now();
  await operation();
  return Date.now() - start;
};

export const expectPerformance = (actualTime, threshold) => {
  expect(actualTime).toBeLessThan(threshold);
};

// Common test patterns
export const testErrorHandling = (operation, error, expectedError) => {
  test(`should handle ${error.name} errors`, async () => {
    const component = createTestComponent();
    component.triggerError('initialize', error);
    await expect(operation(component)).rejects.toThrow(expectedError || error.message);
  });
};

export const testPerformanceThreshold = (operation, threshold, description) => {
  test(`should meet performance threshold: ${description}`, async () => {
    const time = await measurePerformance(operation);
    expectPerformance(time, threshold);
  });
};

// Common assertion helpers
export const expectToHaveStatus = (component, expectedStatus) => {
  expect(component.getStatus().status).toBe(expectedStatus);
};

export const expectToBeHealthy = (component) => {
  const health = component.getHealth();
  expect(health.status).toBe('healthy');
  expect(health.issues).toEqual([]);
};