import LM from './LM.js';
import XenovaProvider from './XenovaProvider.js';

export const setupXenovaProvider = (lm, config, providerId = 'xenova') => {
  if (!(lm instanceof LM)) {
    throw new Error('First argument must be an LM component instance');
  }

  const provider = new XenovaProvider(config);
  lm.registerProvider(providerId, provider);

  return provider;
};

export const createLMWithXenova = (config, providerId = 'xenova') => {
  const lm = new LM();
  setupXenovaProvider(lm, config, providerId);
  return lm;
};