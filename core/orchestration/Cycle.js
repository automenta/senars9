import Component from '../base/Component.js';
import { Logger } from '../base/utilities.js';
import { DEFAULTS } from '../base/constants.js';

class Cycle extends Component {
  constructor() {
    super();
    this.isRunning = false;
    this.cycleTimer = null;
    this.cycleIntervalMs = DEFAULTS.CYCLE_INTERVAL;
  }

  async initialize(config = {}) {
    await super.initialize(config);
    this.cycleIntervalMs = config.cycleIntervalMs ?? this.cycleIntervalMs;
  }

  async start() {
    if (this.isRunning) {
      Logger.warn('Cycle is already running');
      return;
    }

    this.isRunning = true;
    this.cycleTimer = setInterval(() => this._runCycle(), this.cycleIntervalMs);

    Logger.debug(`Cycle started with interval: ${this.cycleIntervalMs}ms`);
    await super.start();
  }

  async stop() {
    if (!this.isRunning) {
      Logger.warn('Cycle is not running');
      return;
    }

    this.isRunning = false;
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }

    Logger.debug('Cycle stopped');
    await super.stop();
  }

  async _runCycle() {
    if (!this.core) {
      Logger.error('Core not available in Cycle component');
      return;
    }

    try {
      const focusSet = await this._selectFocusSet();

      // Use reasoning component if available (previously called reasoner)
      if (this.core.reasoning) {
        const derivedTasks = await this.core.reasoning.reason(focusSet);
        if (derivedTasks.length > 0 && this.core.memory) {
          // TODO: Uncomment when core.memory.addTasks is implemented
          // await this.core.memory.addTasks(derivedTasks);
        }
      }
      // For backward compatibility, check for old reasoner property too
      else if (this.core.reasoner) {
        const derivedTasks = await this.core.reasoner.reason(focusSet);
        if (derivedTasks.length > 0 && this.core.memory) {
          // TODO: Uncomment when core.memory.addTasks is implemented
          // await this.core.memory.addTasks(derivedTasks);
        }
      }

      // Consolidate knowledge if memory component is available
      if (this.core.memory) {
        await this.core.memory.consolidateKnowledge();
      }
    } catch (error) {
      Logger.error('Error in cycle execution', error);
      // Emit error event if messaging is available
      if (this.core.messages) {
        this.core.messages.emit('cycle:error', {
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
  }

  async _selectFocusSet() {
    if (!this.core || !this.core.memory) {
      Logger.warn('Core or Memory component not available for focus set selection');
      return [];
    }

    try {
      // Query memory for tasks with focus criteria
      const allTasks = await this.core.memory.queryTasks({});
      if (!Array.isArray(allTasks)) {
        Logger.warn('Memory.queryTasks did not return an array');
        return [];
      }

      // Sort by creation time (newest first)
      allTasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      // Limit to focus set size from config
      const focusSetSize = this.core.config.get('core.focusSetSize', 10);
      return allTasks.slice(0, focusSetSize);
    } catch (error) {
      Logger.error('Error selecting focus set', error);
      return [];
    }
  }

  getStats() {
    return {
      isRunning: this.isRunning,
      interval: this.cycleIntervalMs,
      timerActive: this.cycleTimer !== null
    };
  }
}

export default Cycle;