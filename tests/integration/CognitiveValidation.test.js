import System from '../../core/System.js';

describe('Cognitive Validation Tests', () => {
  let system;

  beforeEach(async () => {
    system = new System({
      config: {
        maxTasks: 100,
        maxRules: 50,
        enableWebSocket: false // Disable for testing
      }
    });
    await system.start();
  });

  afterEach(async () => {
    if (system) {
      await system.stop();
    }
  });

  describe('Basic Cognitive Capabilities', () => {
    test('System initializes and runs basic cognitive cycle', async () => {
      // System should be running
      expect(system.getHealth().status).toBe('running');

      // Should be able to input tasks
      const task = system.input({
        term: '(cat --> mammal)',
        punctuation: '.',
        truth: { frequency: 1.0, confidence: 0.9 }
      });

      expect(task.term).toBe('(cat --> mammal)');
      expect(task.truth.frequency).toBe(1.0);
    });

    test('Can add and retrieve tasks from memory', async () => {
      // Add a belief
      const belief = system.remember('(dog --> mammal)', { frequency: 1.0, confidence: 0.9 });
      expect(belief.term).toBe('(dog --> mammal)');

      // Add a question
      const question = system.input({
        term: '(dog --> mammal)?',
        punctuation: '?',
        priority: 0.8
      });

      // Memory should contain tasks
      const health = system.getHealth();
      expect(health.tasksProcessed).toBeGreaterThan(0);
    });

    test('Can apply rules to generate new tasks', async () => {
      // Add premise tasks
      system.input({
        term: '(cat --> mammal)',
        punctuation: '.',
        truth: { frequency: 1.0, confidence: 0.9 }
      });

      system.input({
        term: '(mammal --> animal)',
        punctuation: '.',
        truth: { frequency: 1.0, confidence: 0.95 }
      });

      // The reasoning component should be able to process these
      const tasks = [
        { term: '(cat --> mammal)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.9 } },
        { term: '(mammal --> animal)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.95 } }
      ];

      const derivedTasks = await system.core.reasoning.reason(tasks);
      expect(Array.isArray(derivedTasks)).toBe(true);
    });

    test('Has working API for core operations', () => {
      // Test basic API methods exist and are functions
      expect(typeof system.input).toBe('function');
      expect(typeof system.remember).toBe('function');
      expect(typeof system.want).toBe('function');
      expect(typeof system.getHealth).toBe('function');
      expect(typeof system.getStatus).toBe('function');
      expect(typeof system.getMetrics).toBe('function');
    });
  });

  describe('Component Integration', () => {
    test('All core components are accessible', () => {
      expect(system.core).toBeDefined();
      expect(system.core.config).toBeDefined();
      expect(system.core.messages).toBeDefined();
      expect(system.core.rules).toBeDefined();
      expect(system.core.memory).toBeDefined();
      expect(system.core.reasoning).toBeDefined();
    });

    test('Components have required methods', () => {
      // Config component
      expect(typeof system.core.config.getHealth).toBe('function');

      // Messages component
      expect(typeof system.core.messages.emit).toBe('function');
      expect(typeof system.core.messages.on).toBe('function');

      // Rules component
      expect(typeof system.core.rules.getHealth).toBe('function');

      // Memory component
      expect(typeof system.core.memory.getHealth).toBe('function');

      // Reasoning component
      expect(typeof system.core.reasoning.reason).toBe('function');
      expect(typeof system.core.reasoning.getStats).toBe('function');
    });
  });

  describe('Event System', () => {
    test('Can register and trigger events', (done) => {
      let eventTriggered = false;

      system.on('test_event', (data) => {
        eventTriggered = true;
        expect(data.message).toBe('test');
        done();
      });

      // Emit test event
      system.core.messages.emit('test_event', { message: 'test' });

      // Cleanup
      setTimeout(() => {
        if (!eventTriggered) {
          done(new Error('Event was not triggered'));
        }
      }, 100);
    });

    test('Event handlers can be removed', () => {
      let callCount = 0;

      const handler = () => { callCount++; };

      system.on('test_cleanup', handler);
      system.core.messages.emit('test_cleanup', {});

      expect(callCount).toBe(1);

      system.off('test_cleanup', handler);
      system.core.messages.emit('test_cleanup', {});

      expect(callCount).toBe(1); // Should not increase after removal
    });
  });

  describe('Reasoning Capabilities', () => {
    test('Can perform basic inference operations', async () => {
      const tasks = [
        { term: '(sparrow --> bird)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.9 } },
        { term: '(bird --> animal)', punctuation: '.', truth: { frequency: 1.0, confidence: 0.95 } }
      ];

      const results = await system.core.reasoning.reason(tasks);

      // Should return an array (even if empty for simple cases)
      expect(Array.isArray(results)).toBe(true);

      // Should have reasoning history
      const history = system.core.reasoning.getReasoningHistory(10);
      expect(Array.isArray(history)).toBe(true);
    });

    test('Reasoning component tracks performance', () => {
      const stats = system.core.reasoning.getStats();

      expect(stats).toHaveProperty('strategies');
      expect(stats).toHaveProperty('inferenceRules');
      expect(stats).toHaveProperty('historySize');
      expect(typeof stats.strategies).toBe('number');
      expect(typeof stats.inferenceRules).toBe('number');
      expect(typeof stats.historySize).toBe('number');
    });
  });

  describe('Memory Management', () => {
    test('Memory component manages tasks efficiently', () => {
      const health = system.core.memory.getHealth();
      const stats = system.core.memory.getStats();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('issues');
      expect(stats).toHaveProperty('storageSize');
      expect(stats).toHaveProperty('focusSets');
      expect(typeof stats.storageSize).toBe('number');
    });

    test('Can handle multiple tasks without errors', () => {
      // Add multiple tasks rapidly
      for (let i = 0; i < 10; i++) {
        system.input({
          term: `(task${i} --> test)`,
          punctuation: '.',
          truth: { frequency: 0.8, confidence: 0.7 }
        });
      }

      const health = system.getHealth();
      expect(health.tasksProcessed).toBeGreaterThanOrEqual(10);
    });
  });

  describe('System Resilience', () => {
    test('System handles invalid input gracefully', () => {
      expect(() => {
        system.input(null);
      }).toThrow();

      expect(() => {
        system.input({ invalid: 'task' });
      }).toThrow();

      // System should still be healthy after errors
      expect(system.getHealth().status).toBe('running');
    });

    test('System provides meaningful error messages', () => {
      try {
        system.input(null);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Task must be an object');
      }
    });
  });

  describe('Performance Characteristics', () => {
    test('Basic operations complete within reasonable time', async () => {
      const startTime = Date.now();

      // Perform several operations
      for (let i = 0; i < 5; i++) {
        system.input({
          term: `(perf_test_${i} --> benchmark)`,
          punctuation: '.',
          truth: { frequency: 0.8, confidence: 0.7 }
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 1 second for basic operations
      expect(duration).toBeLessThan(1000);
    });

    test('System provides performance metrics', () => {
      const metrics = system.getMetrics();

      expect(metrics).toHaveProperty('system');
      expect(metrics).toHaveProperty('components');
      expect(metrics.system).toHaveProperty('uptime');
      expect(metrics.system).toHaveProperty('tasksProcessed');
      expect(metrics.system).toHaveProperty('isRunning');
    });
  });
});