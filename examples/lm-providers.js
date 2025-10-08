import { createCore } from '../core/createCore.js';
import { setupLangChainProvider, setupXenovaProvider } from '../core/index.js';

const demonstrateLMProviders = async () => {
  console.log('🚀 Demonstrating LM Providers\n');

  const core = await createCore();

  console.log('1️⃣ Setting up Xenova provider (local distilgpt2)...');
  setupXenovaProvider(core.lm, {
    modelName: 'Xenova/distilgpt2',
    temperature: 0.7,
    maxTokens: 50,
  }, 'local');

  console.log('2️⃣ Setting up LangChain provider (OpenAI-compatible API)...');
  setupLangChainProvider(core.lm, {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://api.openai.com/v1',
    modelName: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 100,
  }, 'api');

  console.log('3️⃣ Testing local model...');
  try {
    const localResponse = await core.lm.generateText('Hello, how are you?', {}, 'local');
    console.log('Local response:', localResponse.slice(0, 100) + '...');
  } catch (error) {
    console.log('Local model test skipped (requires model download):', error.message);
  }

  console.log('4️⃣ Testing API model (if API key available)...');
  try {
    const apiResponse = await core.lm.generateText('Explain quantum computing simply.', {}, 'api');
    console.log('API response:', apiResponse.slice(0, 100) + '...');
  } catch (error) {
    console.log('API model test skipped (requires API key):', error.message);
  }

  console.log('\n✅ LM Providers demonstration complete!');
};

demonstrateLMProviders().catch(console.error);