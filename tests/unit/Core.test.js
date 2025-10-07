import { jest } from '@jest/globals';
import Core from '../../core/Core.js';
import Component from '../../core/Component.js';
import Config from '../../core/Config.js';

// A lightweight, real component for testing lifecycle call order.
class TestComponent extends Component {
  constructor(name, callOrderArray) {
    super();
    this.name = name;
    this.callOrder = callOrderArray;
    this.config = {};
  }
  async initialize(config) {
    this.config = config;
    this.callOrder.push(`init:${this.name}`);
    await super.initialize(config);
  }
  async start() {
    this.callOrder.push(`start:${this.name}`);
    await super.start();
  }
  async stop() {
    this.callOrder.push(`stop:${this.name}`);
    await super.stop();
  }
  async destroy() {
    this.callOrder.push(`destroy:${this.name}`);
    await super.destroy();
  }
}

describe('Core', () => {
  let core;

  beforeEach(() => {
    core = new Core();
  });

  test('should instantiate with real config and messages components', () => {
    expect(core.getComponent('config')).toBeDefined();
    expect(core.getComponent('messages')).toBeDefined();
    expect(core.config).toBe(core.getComponent('config')); // Proxy access
    expect(core.messages).toBe(core.getComponent('messages')); // Proxy access
  });

  describe('Lifecycle Management', () => {
    let callOrder;
    let compA, compB;

    beforeEach(() => {
      core = new Core(); // Re-instantiate for a clean slate
      callOrder = [];

      // Use the real Config component but spy on its initialize method to track call order.
      const realConfig = new Config();
      jest.spyOn(realConfig, 'initialize').mockImplementation(async (cfg) => {
        callOrder.push('init:config');
        // Call the original implementation to maintain functionality
        await Config.prototype.initialize.call(realConfig, cfg);
      });

      core.componentMap.set('config', realConfig);
      core.componentMap.set('messages', new TestComponent('messages', callOrder));

      compA = new TestComponent('compA', callOrder);
      compB = new TestComponent('compB', callOrder);

      core.registerComponent('compA', compA);
      core.registerComponent('compB', compB);
    });

    test('initialize should initialize all components in registration order', async () => {
      const initialConfig = { components: { compA: { setting: 123 } } };
      await core.initialize(initialConfig);

      // Verify order: config is always first, followed by registration order.
      expect(callOrder).toEqual(['init:config', 'init:messages', 'init:compA', 'init:compB']);

      // Verify that the config was passed correctly to the test component.
      expect(compA.config).toEqual({ setting: 123 });
      expect(compB.config).toEqual({}); // compB received the default empty config
    });

    test('start should start all components in registration order', async () => {
      await core.start();
      expect(callOrder).toEqual(['start:messages', 'start:compA', 'start:compB']);
    });

    test('stop should stop all components in reverse registration order', async () => {
      // Manually set the config spy for this test since it's not part of the TestComponent
      jest.spyOn(core.config, 'stop').mockImplementation(async () => { callOrder.push('stop:config'); });
      await core.stop();
      expect(callOrder).toEqual(['stop:compB', 'stop:compA', 'stop:messages', 'stop:config']);
    });

    test('destroy should destroy all components in reverse registration order', async () => {
      // Manually set the config spy for this test
      jest.spyOn(core.config, 'destroy').mockImplementation(async () => { callOrder.push('destroy:config'); });
      await core.destroy();
      expect(callOrder).toEqual(['destroy:compB', 'destroy:compA', 'destroy:messages', 'destroy:config']);
    });
  });
});