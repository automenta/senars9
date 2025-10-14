import { WebSocketUtils } from './WebSocketUtils.js';

class ReasoningCycleManager {
  constructor() {
    this.memory = null;
    this.reasoner = null;
    this.selector = null;
    this.reasoningInterval = null;
  }

  async initialize() {
    try {
      // Import here to avoid circular dependencies
      const { default: Memory } = await import('../Memory.js');
      const { default: Reasoner } = await import('../Reasoner.js');
      const { default: FocusSetSelector } = await import('../FocusSetSelector.js');

      this.memory = new Memory();
      this.reasoner = new Reasoner();
      this.selector = new FocusSetSelector();

      // Import and register reasoning rules
      const { DeductiveSyllogism, Induction, Abduction } = await import('./reasoning/SyllogisticRules.js');
      this.reasoner.addRule(new DeductiveSyllogism());
      this.reasoner.addRule(new Induction());
      this.reasoner.addRule(new Abduction());

      WebSocketUtils.debug('Reasoning rules registered for task derivation');
    } catch (error) {
      WebSocketUtils.error('Failed to initialize reasoning cycle manager:', error);
      throw error;
    }
  }

  startReasoningCycle(callback) {
    if (this.reasoningInterval) {
      clearInterval(this.reasoningInterval);
    }

    this.reasoningInterval = setInterval(() => {
      this.executeReasoningCycle(callback);
    }, 1000);
  }

  executeReasoningCycle(callback) {
    try {
      if (!this.memory || !this.reasoner || !this.selector) {
        WebSocketUtils.warn('Reasoning components not initialized');
        return;
      }

      const context = new CycleContext(Date.now());
      runSingleCycle(this.memory, this.reasoner, this.selector, context);

      if (callback) {
        callback();
      }
    } catch (error) {
      WebSocketUtils.error('Error in reasoning cycle:', error);
    }
  }

  stopReasoningCycle() {
    if (this.reasoningInterval) {
      clearInterval(this.reasoningInterval);
      this.reasoningInterval = null;
    }
  }

  reset() {
    this.stopReasoningCycle();
    this.memory = null;
    this.reasoner = null;
    this.selector = null;
  }
}

export default ReasoningCycleManager;