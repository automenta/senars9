import { ProviderSetup } from './ProviderSetup.js';
import XenovaProvider from './XenovaProvider.js';

export const setupXenovaProvider = (lm, config, providerId = 'xenova') => {
  return ProviderSetup.setupProvider(lm, XenovaProvider, config, providerId);
};

export const createLMWithXenova = (config, providerId = 'xenova') => {
  return ProviderSetup.createLMWithProvider(XenovaProvider, config, providerId);
};