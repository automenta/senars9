class LangChainProvider {
  constructor(config = {}) {
    this.modelName = config.modelName || 'gpt-3.5-turbo';
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL;
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 1000;

    if (!this.apiKey) {
      throw new Error('API key is required for LangChain provider');
    }
    if (!this.baseURL) {
      throw new Error('Base URL is required for LangChain provider');
    }
  }

  async generateText(prompt, options = {}) {
    const { ChatOpenAI } = await import('langchain/chat_models/openai');
    const { HumanMessage } = await import('langchain/schema');

    const chatModel = new ChatOpenAI({
      modelName: this.modelName,
      openAIApiKey: this.apiKey,
      configuration: {
        baseURL: this.baseURL,
      },
      temperature: options.temperature ?? this.temperature,
      maxTokens: options.maxTokens ?? this.maxTokens,
    });

    const messages = [new HumanMessage(prompt)];
    const response = await chatModel.call(messages);
    return response.content;
  }

  async generateEmbedding(text) {
    const { OpenAIEmbeddings } = await import('langchain/embeddings/openai');

    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: this.apiKey,
      configuration: {
        baseURL: this.baseURL,
      },
    });

    return embeddings.embedQuery(text);
  }

  async generateHypothesis(observations, options = {}) {
    const observationsText = observations.join('\n');
    const prompt = `Based on these observations:\n${observationsText}\n\nGenerate a hypothesis about what might be happening:`;

    return this.generateText(prompt, options);
  }
}

export default LangChainProvider;