import Config from '../../core/Config.js';

describe('Config Component', () => {
  let config;

  beforeEach(async () => {
    config = new Config();
    await config.initialize({
      core: {
        cycleIntervalMs: 50,
      },
      components: {
        memory: {
          maxShortTermTasks: 1000,
        },
      },
    });
  });

  test('should initialize with a default configuration', () => {
    expect(config.get('core.cycleIntervalMs')).toBe(50);
  });

  test('should retrieve a nested configuration value', () => {
    const maxTasks = config.get('components.memory.maxShortTermTasks');
    expect(maxTasks).toBe(1000);
  });

  test('should return a default value for a non-existent key', () => {
    const nonExistent = config.get('core.nonExistent', 'default');
    expect(nonExistent).toBe('default');
  });

  test('should set a new configuration value', () => {
    config.set('components.reasoning.maxRuleApplications', 100);
    const maxRules = config.get('components.reasoning.maxRuleApplications');
    expect(maxRules).toBe(100);
  });

  test('should deep merge a new configuration object', () => {
    config.merge({
      core: {
        focusSetSize: 10,
      },
      components: {
        memory: {
          consolidationThreshold: 0.8,
        },
      },
    });

    expect(config.get('core.cycleIntervalMs')).toBe(50);
    expect(config.get('core.focusSetSize')).toBe(10);
    expect(config.get('components.memory.maxShortTermTasks')).toBe(1000);
    expect(config.get('components.memory.consolidationThreshold')).toBe(0.8);
  });

  test('should invalidate cache after setting a value', () => {
    // Populate cache
    expect(config.get('core.cycleIntervalMs')).toBe(50);
    expect(config.cache.has('core.cycleIntervalMs')).toBe(true);

    // Set a new value
    config.set('core.cycleIntervalMs', 100);
    expect(config.cache.size).toBe(0);
    expect(config.get('core.cycleIntervalMs')).toBe(100);
  });
});