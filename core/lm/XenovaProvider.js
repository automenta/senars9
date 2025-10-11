class XenovaProvider {
  constructor(config = {}) {
    this.modelName = config.modelName || 'Xenova/distilgpt2';
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 100;
    this.device = config.device || 'webgpu';

    this.generator = null;
    this.initialized = false;
  }

  async _ensureInitialized() {
    if (this.initialized) return;

    const { pipeline } = await import('@xenova/transformers');

    this.generator = await pipeline('text-generation', this.modelName, {
      device: this.device,
    });

    this.initialized = true;
  }

  async generateText(prompt, options = {}) {
    await this._ensureInitialized();

    const temperature = options.temperature ?? this.temperature;
    const maxTokens = options.maxTokens ?? this.maxTokens;

    const result = await this.generator(prompt, {
      max_new_tokens: maxTokens,
      temperature: temperature,
      do_sample: temperature > 0,
      pad_token_id: 50256,
    });

    return result[0].generated_text;
  }

  async generateEmbedding(text) {
    await this._ensureInitialized();

    const { pipeline: embeddingPipeline } = await import('@xenova/transformers');

    const embedder = await embeddingPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      device: this.device,
    });

    const output = await embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  async generateHypothesis(observations, options = {}) {
    const observationsText = observations.join('\n');
    const prompt = `Based on these observations:\n${observationsText}\n\nGenerate a hypothesis about what might be happening:`;

    return this.generateText(prompt, options);
  }
}

export default XenovaProvider;