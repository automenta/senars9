import { ProviderSetup } from './ProviderSetup.js';
import LangChainProvider from './LangChainProvider.js';

export const setupLangChainProvider = (lm, config, providerId = 'langchain') => {
  return ProviderSetup.setupProvider(
    lm,
    LangChainProvider,
    { ...config, _setupMode: true },
    providerId,
    ['apiKey', 'baseURL']
  );
};

export const createLMWithLangChain = (config, providerId = 'langchain') => {
  return ProviderSetup.createLMWithProvider(
    LangChainProvider,
    { ...config, _setupMode: true },
    providerId,
    ['apiKey', 'baseURL']
  );
};