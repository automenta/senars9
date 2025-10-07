import { jest } from '@jest/globals';
import LM from '../../core/LM.js';

describe('LM Component', () => {
  let lm;

  beforeEach(async () => {
    lm = new LM();
    await lm.initialize({ defaultProvider: 'ollama' });
  });

  test('should initialize with default mock providers', () => {
    expect(lm.providers.has('ollama')).toBe(true);
    expect(lm.providers.has('xenova')).toBe(true);
    expect(lm.getMetrics().providerCount).toBe(2);
  });

  test('should add a new provider', () => {
    const newProvider = { id: 'custom', name: 'Custom Provider', generate: async () => {} };
    lm.addProvider(newProvider);
    expect(lm.providers.has('custom')).toBe(true);
    expect(lm.getMetrics().providerCount).toBe(3);
  });

  test('should generate text using the default provider', async () => {
    const result = await lm.generateText('test prompt');
    expect(result).toBe('Mock response for: "test prompt"');
  });

  test('should generate text using a specified provider', async () => {
    const xenovaProvider = lm.providers.get('xenova');
    const spy = jest.spyOn(xenovaProvider, 'generate');
    await lm.generateText('test prompt', { provider: 'xenova' });
    expect(spy).toHaveBeenCalled();
  });

  test('should generate an embedding using the default provider', async () => {
    const embedding = await lm.generateEmbedding('test text');
    expect(embedding).toEqual([0.1, 0.2, 0.3]);
  });

  test('should generate an embedding using a specified provider', async () => {
    const embedding = await lm.generateEmbedding('test text', { provider: 'xenova' });
    expect(embedding).toEqual([0.4, 0.5, 0.6]);
  });

  test('should throw an error for a non-existent provider', async () => {
    await expect(lm.generateText('prompt', { provider: 'non-existent' })).rejects.toThrow(
      'LM provider "non-existent" not found.'
    );
  });

  test('should throw an error when adding a provider without an ID', () => {
    expect(() => {
      lm.addProvider({ name: 'Invalid Provider' });
    }).toThrow('Provider must have an ID.');
  });
});