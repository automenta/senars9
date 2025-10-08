import { describe, test, expect } from '@jest/globals';
import { LM, setupLangChainProvider, setupXenovaProvider } from '../../core/index.js';

describe('LM Providers Examples - Unit Tests', () => {
  describe('LM Provider Setup', () => {
    test('should set up Xenova provider correctly', () => {
      const localLM = new LM();

      // Test provider setup (without actually downloading models)
      expect(() => {
        setupXenovaProvider(localLM, {
          modelName: 'Xenova/distilgpt2',
          temperature: 0.7,
          maxTokens: 50,
        }, 'local');
      }).not.toThrow();
    });

    test('should set up LangChain provider correctly', () => {
      const apiLM = new LM();

      // Test provider setup (will fail without API key, but setup should work)
      expect(() => {
        setupLangChainProvider(apiLM, {
          apiKey: process.env.OPENAI_API_KEY || 'test-key',
          baseURL: 'https://api.openai.com/v1',
          modelName: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 100,
        }, 'api');
      }).not.toThrow();
    });

    test('should handle LM instances correctly', () => {
      const lm1 = new LM();
      const lm2 = new LM();

      // Verify LM instances are created properly
      expect(lm1).toBeInstanceOf(LM);
      expect(lm2).toBeInstanceOf(LM);
      expect(lm1).not.toBe(lm2); // Different instances
    });
  });

  describe('LM Provider Configuration', () => {
    test('should accept different configuration options', () => {
      const lm = new LM();

      // Test different configuration scenarios
      expect(() => {
        setupXenovaProvider(lm, {
          modelName: 'Xenova/distilgpt2',
          temperature: 0.5,
          maxTokens: 100,
        }, 'test-provider');
      }).not.toThrow();

      expect(() => {
        setupLangChainProvider(lm, {
          apiKey: 'test-key',
          baseURL: 'https://api.example.com/v1',
          modelName: 'test-model',
          temperature: 0.8,
          maxTokens: 200,
        }, 'test-provider');
      }).not.toThrow();
    });

    test('should handle missing configuration gracefully', () => {
      const lm = new LM();

      // Should handle missing optional config
      expect(() => {
        setupXenovaProvider(lm, {
          modelName: 'Xenova/distilgpt2'
        }, 'minimal-config');
      }).not.toThrow();
    });
  });

  describe('LM Provider Interface', () => {
    test('should provide consistent interface across providers', () => {
      const xenovaLM = new LM();
      const langchainLM = new LM();

      // Set up providers
      setupXenovaProvider(xenovaLM, {
        modelName: 'Xenova/distilgpt2'
      }, 'xenova');

      setupLangChainProvider(langchainLM, {
        apiKey: 'test-key',
        modelName: 'test-model'
      }, 'langchain');

      // Both should be LM instances
      expect(xenovaLM).toBeInstanceOf(LM);
      expect(langchainLM).toBeInstanceOf(LM);
    });

    test('should handle provider-specific options', () => {
      const lm = new LM();

      // Test provider-specific configurations
      expect(() => {
        setupXenovaProvider(lm, {
          modelName: 'Xenova/distilgpt2',
          temperature: 0.7,
          maxTokens: 50,
        }, 'xenova-provider');
      }).not.toThrow();

      expect(() => {
        setupLangChainProvider(lm, {
          apiKey: 'test-key',
          baseURL: 'https://api.openai.com/v1',
          modelName: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 100,
        }, 'openai-provider');
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing API keys gracefully', () => {
      const lm = new LM();

      // Should not throw during setup even without API key
      expect(() => {
        setupLangChainProvider(lm, {
          apiKey: undefined,
          modelName: 'test-model'
        }, 'test-provider');
      }).not.toThrow();
    });

    test('should handle invalid configurations gracefully', () => {
      const lm = new LM();

      // Should handle various invalid configs without throwing during setup
      expect(() => {
        setupXenovaProvider(lm, {}, 'empty-config');
      }).not.toThrow();

      expect(() => {
        setupLangChainProvider(lm, {
          apiKey: 'test'
        }, 'incomplete-config');
      }).not.toThrow();
    });
  });
});