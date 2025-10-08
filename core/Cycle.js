import Component from './Component.js';

class Cycle extends Component {
  constructor() {
    super();
    this.isRunning = false;
    this.cycleTimer = null;
    this.cycleIntervalMs = 100;
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.cycleIntervalMs = config.cycleIntervalMs || this.cycleIntervalMs;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.cycleTimer = setInterval(() => this._runCycle(), this.cycleIntervalMs);
    await super.start();
  }

  async stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }
    await super.stop();
  }

  async _runCycle() {
    if (!this.core) return;

    const focusSet = await this._selectFocusSet();

    if (this.core.reasoner) {
      const derivedTasks = await this.core.reasoner.reason(focusSet);
      if (derivedTasks.length > 0 && this.core.memory) {
        // await this.core.memory.addTasks(derivedTasks);
      }
    }

    if (this.core.memory) {
      await this.core.memory.consolidateKnowledge();
    }
  }

  async _selectFocusSet() {
    if (!this.core || !this.core.memory) {
      return [];
    }
    const allTasks = await this.core.memory.queryTasks({});
    allTasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const focusSetSize = this.core.config.get('core.focusSetSize', 10);
    return allTasks.slice(0, focusSetSize);
  }
}

export default Cycle;