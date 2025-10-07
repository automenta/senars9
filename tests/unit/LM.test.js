/**
 * @file: tests/unit/LM.test.js
 * @description: Unit tests for the LM component.
 */

import { jest } from '@jest/globals';
import LM from '../../core/LM.js';

describe('LM Component', () => {
  let lm;
  let mockProvider;

  beforeEach(() => {
    lm = new LM();

    mockProvider = {
      generateText: jest.fn().mockResolvedValue('generated text'),
      generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      generateHypothesis: jest.fn().mockResolvedValue({ hypothesis: 'a new idea' }),
    };

    lm.initialize({ defaultProvider: 'mock' });
    lm.registerProvider('mock', mockProvider);
  });

  test('should register a provider and set it as default', () => {
    expect(lm.defaultProviderId).toBe('mock');
    expect(lm.providers.get('mock')).toEqual(mockProvider);
  });

  test('should generate text using the default provider', async () => {
    const result = await lm.generateText('a prompt');
    expect(mockProvider.generateText).toHaveBeenCalledWith('a prompt', {});
    expect(result).toBe('generated text');
  });

  test('should generate an embedding using a specified provider', async () => {
    const newProvider = { generateEmbedding: jest.fn().mockResolvedValue([0.4, 0.5]) };
    lm.registerProvider('new', newProvider);

    const result = await lm.generateEmbedding('some text', 'new');
    expect(newProvider.generateEmbedding).toHaveBeenCalledWith('some text');
    expect(result).toEqual([0.4, 0.5]);
  });

  test('should generate a hypothesis', async () => {
    const observations = ['obs1', 'obs2'];
    const result = await lm.generateHypothesis(observations);
    expect(mockProvider.generateHypothesis).toHaveBeenCalledWith(observations, {});
    expect(result).toEqual({ hypothesis: 'a new idea' });
  });

  test('should throw an error if provider is not found', async () => {
    await expect(lm.generateText('prompt', {}, 'nonexistent')).rejects.toThrow('LM provider "nonexistent" not found or no default provider is set.');
  });

  test('should throw an error if hypothesis generation is not supported', async () => {
    const simpleProvider = { generateText: () => {} };
    lm.registerProvider('simple', simpleProvider);
    await expect(lm.generateHypothesis([], {}, 'simple')).rejects.toThrow('Provider "simple" does not support hypothesis generation.');
  });
});