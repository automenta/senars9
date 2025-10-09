import { Memory } from './Memory.js';
import { Reasoner } from './Reasoner.js';
import { IterativeClock } from './Clock.js';
import { FocusSetSelector } from './FocusSetSelector.js';
import { runSingleCycle, CycleContext } from './Cycle.js';
import { parse } from './parser/Parser.js'; // We'll create this next

/**
 * The main orchestrator for the SeNARS system.
 * 
 * This class owns all the core components (Memory, Reasoner, Clock, FocusSetSelector)
 * and provides the primary public API for interacting with the system.
 */
export class System {
  /**
   * Creates a new System with the given clock and default components.
   * @param {Clock} clock - A Clock instance (e.g., IterativeClock or UnixTimeClock)
   */
  constructor(clock = null) {
    // Core components
    this.memory = new Memory();
    this.reasoner = new Reasoner();
    this.clock = clock || new IterativeClock();
    this.focusSetSelector = new FocusSetSelector();

    // Statistics and control
    this.isRunning = false;
  }

  /**
   * Parses a Narsese string and adds the resulting task to memory.
   * 
   * The new task and any newly created concepts are timestamped with the
   * clock's current time.
   * 
   * @param {string} narseseInput - The Narsese string to parse (e.g., "(cat --> mammal).")
   */
  input(narseseInput) {
    const currentTime = this.clock.getTime();
    try {
      const task = parse(narseseInput, currentTime);
      this.memory.addTask(task, currentTime);
    } catch (e) {
      console.error(`Failed to parse input: ${e.message}`);
    }
  }

  /**
   * Runs a single cognitive cycle.
   * 
   * This method is the "heartbeat" of the system. It advances the clock,
   * gets the current time, and then executes one full reasoning cycle.
   */
  tick() {
    // First, advance the clock's state
    this.clock.tick();

    // Then, get the new current time and create the context for this cycle
    const currentTime = this.clock.getTime();
    const context = new CycleContext(currentTime);

    // Run one full cognitive cycle with the consistent context
    runSingleCycle(
      this.memory,
      this.reasoner,
      this.focusSetSelector,
      context
    );
  }

  /**
   * Starts the system's continuous operation.
   * @param {number} intervalMs - Interval between cycles in milliseconds (default: 100ms)
   */
  start(intervalMs = 100) {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this._runLoop(intervalMs);
  }

  /**
   * Stops the system's continuous operation.
   */
  stop() {
    this.isRunning = false;
  }

  /**
   * Internal method to run the system in a continuous loop.
   * @private
   */
  _runLoop(intervalMs) {
    const runCycle = () => {
      if (this.isRunning) {
        this.tick();
        setTimeout(runCycle, intervalMs);
      }
    };
    runCycle();
  }

  /**
   * Gets system statistics.
   * @returns {Object} System statistics
   */
  getStats() {
    return {
      totalTasks: this.memory.totalTasks,
      consolidationCount: this.memory.consolidationCount,
      lastConsolidation: this.memory.lastConsolidation,
      isRunning: this.isRunning,
      currentTime: this.clock.getTime()
    };
  }
}