import {Rule} from './Rule.js';

export class LMRule extends Rule {
    constructor(id, promptTemplate, responseProcessor, priority = 1.0, config = {}) {
        super(id, 'lm', priority, config);
        this._promptTemplate = promptTemplate;
        this._responseProcessor = responseProcessor;
        this._lmConfig = {
            temperature: 0.7,
            maxTokens: 1000,
            model: 'default',
            ...config.lm
        };
        Object.freeze(this);
    }

    get promptTemplate() { return this._promptTemplate; }
    get responseProcessor() { return this._responseProcessor; }
    get lmConfig() { return { ...this._lmConfig }; }

    _matches(task) { return this._enabled && this._isRelevant(task); }
    _isRelevant(task) { return true; }

    async _apply(task) {
        try {
            const prompt = this._buildPrompt(task);
            const response = await this._callLanguageModel(prompt);
            const processedResponse = await this._responseProcessor(response, task);
            return Array.isArray(processedResponse) ? processedResponse : [processedResponse];
        } catch (error) {
            console.warn(`LM rule ${this.id} failed:`, error);
            return [];
        }
    }

    _buildPrompt(task) {
        const templateVars = {
            taskTerm: task.term.toString(),
            taskType: task.type,
            taskTruth: task.truth ? `(${task.truth.f.toFixed(2)}, ${task.truth.c.toFixed(2)})` : 'no truth',
            context: this._getContext(task)
        };

        return this._promptTemplate.replace(/\{\{(\w+)\}\}/g, (match, key) =>
            templateVars[key] !== undefined ? templateVars[key] : match
        );
    }

    _getContext(task) { return `Task: ${task.term.toString()}, Type: ${task.type}`; }

    async _callLanguageModel(prompt) {
        if (this._config.mock) return this._mockLMResponse(prompt);
        throw new Error('No language model provider configured');
    }

    _mockLMResponse(prompt) {
        return Promise.resolve({
            content: `Based on the task "${prompt.substring(0, 100)}...", I think...`,
            usage: { tokens: 150 },
            model: this._lmConfig.model
        });
    }

    withConfig(newConfig) {
        return new LMRule(this.id, this._promptTemplate, this._responseProcessor, this.priority,
            { ...this._config, ...newConfig });
    }

    withTemperature(temperature) { return this.withConfig({ lm: { ...this._lmConfig, temperature } }); }
    withMaxTokens(maxTokens) { return this.withConfig({ lm: { ...this._lmConfig, maxTokens } }); }
    withModel(model) { return this.withConfig({ lm: { ...this._lmConfig, model } }); }
}