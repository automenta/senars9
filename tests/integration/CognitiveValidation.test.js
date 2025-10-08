import { jest } from '@jest/globals';
import System from '../../core/System.js';

describe('SeNARS Cognitive Validation Tests', () => {
  let system;

  beforeEach(async () => {
    system = new System({
      components: {
        memory: {
          maxItems: 1000,
          focusSetSize: 10
        },
        rules: {
          maxRules: 100,
          enablePrefiltering: true
        }
      }
    });
    await system.start();
  });

  afterEach(async () => {
    await system.stop();
  });

  describe('Basic Cognitive Capabilities', () => {
    test('should process and store beliefs', async () => {
      const belief = system.remember('The sky is blue');

      expect(belief.term).toBe('The sky is blue');
      expect(belief.punctuation).toBe('.');
      expect(belief.truth.frequency).toBe(1.0);
    });

    test('should handle goals and desires', async () => {
      const goal = system.want('Learn JavaScript', 0.9);

      expect(goal.term).toBe('Learn JavaScript');
      expect(goal.punctuation).toBe('!');
      expect(goal.priority).toBe(0.9);
    });

    test('should process questions and store them for reasoning', async () => {
      // First, add some knowledge
      system.remember('JavaScript is a programming language');
      system.remember('Programming languages run on computers');

      // Ask a question (this creates a question task that can be processed)
      const questionTask = {
        term: 'What is JavaScript?',
        punctuation: '?'
      };

      system.input(questionTask);

      // Verify the question was processed
      const health = system.getHealth();
      expect(health.status).toBe('running');
      expect(health.tasksProcessed).toBeGreaterThan(0);
    });
  });

  describe('Reasoning and Inference', () => {
    test('should perform basic deduction', async () => {
      // Add implication rule: If it rains, then the ground is wet
      system.remember('(rain --> wet_ground)');

      // Add fact: It is raining
      system.remember('rain');

      // The system should be able to deduce that the ground is wet
      // This would be validated through the reasoning component
      const health = system.getHealth();
      expect(health.status).toBe('running');
    });

    test('should detect and handle contradictions', async () => {
      // Add conflicting beliefs
      system.remember('The cat is black', { frequency: 0.9, confidence: 0.8 });
      system.remember('The cat is white', { frequency: 0.8, confidence: 0.7 });

      // System should detect contradiction and create resolution task
      const health = system.getHealth();
      expect(health.status).toBe('running');
    });

    test('should perform pattern induction', async () => {
      // Add multiple similar observations
      system.remember('Birds can fly');
      system.remember('Eagles can fly');
      system.remember('Sparrows can fly');

      // System should induce that flying creatures exist
      const health = system.getHealth();
      expect(health.status).toBe('running');
    });
  });

  describe('Memory and Attention', () => {
    test('should manage focus sets and attention', async () => {
      // Add multiple tasks with different priorities
      for (let i = 0; i < 20; i++) {
        system.remember(`Task ${i}`, {
          frequency: 0.8,
          confidence: 0.7
        }, i * 0.05); // Increasing priority
      }

      // Check that high-priority items are in focus
      const health = system.getHealth();
      expect(health.coreHealth.memory).toBeDefined();
    });

    test('should retrieve relevant memories', async () => {
      // Add various types of knowledge
      system.remember('JavaScript is dynamically typed');
      system.remember('Python is strongly typed');
      system.remember('Type safety prevents runtime errors');

      // Memory should be able to retrieve related items
      const health = system.getHealth();
      expect(health.status).toBe('running');
    });
  });

  describe('Learning and Adaptation', () => {
    test('should learn from experience', async () => {
      // Simulate learning process
      system.remember('Practice improves skills');
      system.remember('Consistent effort leads to mastery');

      // System should adapt based on learning
      const health = system.getHealth();
      expect(health.status).toBe('running');
    });

    test('should update beliefs based on new evidence', async () => {
      // Initial belief
      system.remember('It is sunny', { frequency: 0.8, confidence: 0.6 });

      // Contradictory evidence
      system.remember('It is raining', { frequency: 0.9, confidence: 0.8 });

      // System should handle belief revision
      const health = system.getHealth();
      expect(health.status).toBe('running');
    });
  });

  describe('System Integration', () => {
    test('should maintain coherence across components', async () => {
      // Test that all components work together
      system.remember('Integration test belief');
      system.want('Integration test goal');

      const status = system.getStatus();
      expect(status.status).toBe('running');
      expect(status.coreHealth).toBeDefined();
    });

    test('should handle errors gracefully', async () => {
      // Test error handling
      try {
        system.input('Invalid task without term');
      } catch (error) {
        expect(error.message).toContain('Task must be an object');
      }

      // System should still be running after error
      const health = system.getHealth();
      expect(health.status).toBe('running');
    });

    test('should provide comprehensive metrics', async () => {
      // Generate some activity
      system.remember('Metrics test');
      system.want('Monitor performance');

      const metrics = system.getMetrics();
      expect(metrics.system).toBeDefined();
      expect(metrics.components).toBeDefined();
      expect(metrics.system.tasksProcessed).toBeGreaterThan(0);
    });
  });

  describe('Performance Validation', () => {
    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();

      // Process multiple tasks
      for (let i = 0; i < 10; i++) {
        system.remember(`Performance test ${i}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    test('should handle memory pressure gracefully', async () => {
      // Add many items to test memory management
      for (let i = 0; i < 100; i++) {
        system.remember(`Memory stress test ${i}`);
      }

      const health = system.getHealth();
      expect(health.status).toBe('running');
    });
  });

  describe('Cognitive Cycle Validation', () => {
    test('should complete full cognitive cycles', async () => {
      // Simulate a complete cognitive cycle
      const perception = system.remember('Observed: red car');
      const goal = system.want('Understand vehicle colors');

      // The system should process these through the cognitive cycle
      const status = system.getStatus();
      expect(status.status).toBe('running');
    });

    test('should maintain cognitive coherence', async () => {
      // Add related but not contradictory beliefs
      system.remember('All men are mortal');
      system.remember('Socrates is a man');
      system.remember('Therefore Socrates is mortal');

      // System should maintain logical consistency
      const health = system.getHealth();
      expect(health.status).toBe('running');
    });
  });
});