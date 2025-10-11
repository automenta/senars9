import ModelSelector from './ModelSelector.js';

class ReasoningEngine {
  constructor(providerRegistry, ioAdapters) {
    this.modelSelector = new ModelSelector(providerRegistry);
    this.ioAdapters = ioAdapters;
    this.reasoningPrompts = {
      'temporal': 'Analyze the temporal relationships in: ',
      'counterfactual': 'Consider this counterfactual scenario: ',
      'causal': 'Analyze the causal relationship: '
    };
  }

  async temporal(scenario, timeline) {
    return this._process(scenario, 'temporal');
  }

  async counterfactual(scenario) {
    return this._process(scenario, 'counterfactual');
  }

  async causal(cause, effect) {
    return this._process(`${cause} -> ${effect}`, 'causal');
  }

  async _process(scenario, type) {
    const model = await this.modelSelector.select({ type });
    const prompt = `${this.reasoningPrompts[type]}${scenario}`;
    const result = await model.generateText(prompt);
    return this.ioAdapters.narseseConverter.convertToNarsese(result, type);
  }
}

export default ReasoningEngine;