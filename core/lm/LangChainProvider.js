class LangChainProvider {
  constructor(config = {}) {
    this.modelName = config.modelName || 'gpt-3.5-turbo';
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL;
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 1000;

    if (!config._testMode) {
        if (!this.apiKey) {
            throw new Error('API key is required for LangChain provider');
        }
        if (!this.baseURL) {
            this.baseURL = 'http://localhost:11434/v1'; // Default for Ollama
            console.log(`ℹ️  Using default baseURL for local Ollama: ${this.baseURL}`);
        }
    }

    // Handle custom URL format like "xyz:11434" - convert to proper HTTP URL
    if (this.baseURL && this.baseURL.includes(':11434') && !this.baseURL.startsWith('http')) {
      this.baseURL = `http://${this.baseURL}`;
      console.log(`ℹ️  Converted custom URL format to: ${this.baseURL}`);
    }
  }

  async generateText(prompt, options = {}) {
    const { ChatOllama } = await import('@langchain/ollama');
    const { HumanMessage } = await import('@langchain/core/messages');

    // Use ChatOllama for Ollama compatibility
    const chatModel = new ChatOllama({
      model: this.modelName,
      baseUrl: this.baseURL,
      temperature: options.temperature ?? this.temperature,
      maxTokens: options.maxTokens ?? this.maxTokens,
    });

    const messages = [new HumanMessage(prompt)];
    const response = await chatModel.call(messages);
    return response.content;
  }

  async generateEmbedding(text) {
    // For Ollama, embeddings might not be available or might need a different approach
    // For now, we'll return a placeholder since Ollama doesn't always support embeddings
    console.warn("Embeddings not fully supported for Ollama provider");
    return Array(1536).fill(0); // Placeholder embedding
  }

  async generateHypothesis(observations, options = {}) {
    const observationsText = observations.join('\n');
    const prompt = `Based on these observations:\n${observationsText}\n\nGenerate a hypothesis about what might be happening:`;

    return this.generateText(prompt, options);
  }
}

export default LangChainProvider;