import Core from '../../core/Core.js';
import Component from '../../core/Component.js';

// Mock Component for testing
class MockComponent extends Component {
  constructor() {
    super();
    this.isInitialized = false;
    this.isStarted = false;
    this.isStopped = false;
  }
  async initialize(config) {
    await super.initialize(config);
    this.isInitialized = true;
  }
  async start() {
    await super.start();
    this.isStarted = true;
  }
  async stop() {
    await super.stop();
    this.isStopped = true;
  }
}

describe('Core Orchestrator', () => {
  let core;
  let mockComp;

  beforeEach(() => {
    core = new Core();
    mockComp = new MockComponent();
    core.registerComponent('mock', mockComp);
  });

  test('should register a new component', () => {
    expect(core.components.has('mock')).toBe(true);
    expect(core.components.get('mock')).toBe(mockComp);
  });

  test('should provide direct access to components via proxy', () => {
    expect(core.mock).toBe(mockComp);
  });

  test('should initialize all registered components', async () => {
    const initialConfig = {
      components: {
        mock: { setting: 'value' },
      },
    };
    await core.initialize(initialConfig);

    expect(core.config.getStatus().status).toBe('initialized');
    expect(core.messages.getStatus().status).toBe('initialized');
    expect(mockComp.isInitialized).toBe(true);
    expect(mockComp.config).toEqual({ setting: 'value' });
  });

  test('should start all registered components', async () => {
    await core.initialize();
    await core.start();

    expect(core.config.getStatus().status).toBe('running');
    expect(core.messages.getStatus().status).toBe('running');
    expect(mockComp.isStarted).toBe(true);
  });

  test('should stop all registered components', async () => {
    await core.initialize();
    await core.start();
    await core.stop();

    expect(core.config.getStatus().status).toBe('stopped');
    expect(core.messages.getStatus().status).toBe('stopped');
    expect(mockComp.isStopped).toBe(true);
  });

  test('should throw an error when registering a component with a duplicate name', () => {
    expect(() => {
      core.registerComponent('mock', new MockComponent());
    }).toThrow('Component "mock" is already registered.');
  });
});