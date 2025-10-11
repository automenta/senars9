import { describe, test, expect } from '@jest/globals';
import { LM, setupLangChainProvider, setupXenovaProvider } from '../../core/index.js';

const providerConfigs = {
  xenova: {
    setup: setupXenovaProvider,
    configs: [
      { modelName: 'Xenova/distilgpt2', temperature: 0.7, maxTokens: 50 },
      { modelName: 'Xenova/distilgpt2', temperature: 0.5, maxTokens: 100 },
      { modelName: 'Xenova/distilgpt2' }
    ]
  },
  langchain: {
    setup: setupLangChainProvider,
    configs: [
      { apiKey: 'test-key', modelName: 'gpt-3.5-turbo', temperature: 0.7, maxTokens: 100 },
      { apiKey: 'test-key', baseURL: 'https://api.example.com/v1', modelName: 'test-model', temperature: 0.8, maxTokens: 200 },
      { apiKey: 'test-key', modelName: 'test-model' },
      { apiKey: undefined, modelName: 'test-model' }
    ]
  }
};

const createLM = () => new LM();

describe('LM Providers', () => {
  describe('Setup', () => {
    Object.entries(providerConfigs).forEach(([providerName, { setup, configs }]) => {
      test(`should set up ${providerName} provider correctly`, () => {
        configs.forEach(config => {
          const lm = createLM();
          expect(() => setup(lm, config, `${providerName}-test`)).not.toThrow();
        });
      });
    });

    test('should handle LM instances correctly', () => {
      const lm1 = createLM();
      const lm2 = createLM();

      expect(lm1).toBeInstanceOf(LM);
      expect(lm2).toBeInstanceOf(LM);
      expect(lm1).not.toBe(lm2);
    });
  });

  describe('Interface Consistency', () => {
    test('should provide consistent interface across providers', () => {
      const xenovaLM = createLM();
      const langchainLM = createLM();

      setupXenovaProvider(xenovaLM, { modelName: 'Xenova/distilgpt2' }, 'xenova');
      setupLangChainProvider(langchainLM, { apiKey: 'test-key', modelName: 'test-model' }, 'langchain');

      expect(xenovaLM).toBeInstanceOf(LM);
      expect(langchainLM).toBeInstanceOf(LM);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid configurations gracefully', () => {
      const lm = createLM();

      expect(() => setupXenovaProvider(lm, {}, 'empty-config')).not.toThrow();
      expect(() => setupLangChainProvider(lm, { apiKey: 'test' }, 'incomplete-config')).not.toThrow();
    });
  });
});