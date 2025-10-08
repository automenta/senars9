import LM from './LM.js';
import LangChainProvider from './LangChainProvider.js';

export const setupLangChainProvider = (lm, config, providerId = 'langchain') => {
  if (!(lm instanceof LM)) {
    throw new Error('First argument must be an LM component instance');
  }

  const requiredFields = ['apiKey', 'baseURL'];
  for (const field of requiredFields) {
    if (!config[field]) {
      throw new Error(`Configuration error: ${field} is required`);
    }
  }

  const provider = new LangChainProvider(config);
  lm.registerProvider(providerId, provider);

  return provider;
};

export const createLMWithLangChain = (config, providerId = 'langchain') => {
  const lm = new LM();
  setupLangChainProvider(lm, config, providerId);
  return lm;
};