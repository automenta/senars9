import { WebSocketUtils } from './WebSocketUtils.js';

/**
 * Unified reasoning cycle management with consolidated functionality.
 * Combines patterns from ReasoningManager and ReasoningCycleManager for DRY compliance.
 */
class ReasoningManager {
  constructor(core = null) {
    this.core = core;
    this.memory = null;
    this.reasoner = null;
    this.selector = null;
    this.reasoningInterval = null;
    this.cycleCallback = null;
  }

  async initialize() {
    // Support both external core injection and internal initialization
    if (this.core) {
      this.memory = this.core.memory;
      this.reasoner = this.core.reasoner;
      this.selector = this.core.selector;
    } else {
      await this.initializeInternalComponents();
    }
  }

  async initializeInternalComponents() {
    try {
      // Dynamic imports to avoid circular dependencies
      const { default: Memory } = await import('../Memory.js');
      const { default: Reasoner } = await import('../Reasoner.js');
      const { default: FocusSetSelector } = await import('../FocusSetSelector.js');

      this.memory = new Memory();
      this.reasoner = new Reasoner();
      this.selector = new FocusSetSelector();

      // Register reasoning rules
      const { DeductiveSyllogism, Induction, Abduction } = await import('./reasoning/SyllogisticRules.js');
      this.reasoner.addRule(new DeductiveSyllogism());
      this.reasoner.addRule(new Induction());
      this.reasoner.addRule(new Abduction());

      WebSocketUtils.debug('Reasoning components initialized');
    } catch (error) {
      WebSocketUtils.error('Failed to initialize reasoning components:', error);
      throw error;
    }
  }

  startReasoningCycle(interval = 1000, callback = null) {
    if (!this.areComponentsReady()) {
      WebSocketUtils.warn('Reasoning components not ready');
      return false;
    }

    this.stopReasoningCycle(); // Clear any existing interval
    this.cycleCallback = callback;

    this.loadInitialTasks();

    this.reasoningInterval = setInterval(() => {
      this.executeReasoningCycle();
    }, interval);

    return true;
  }

  executeReasoningCycle() {
    try {
      if (!this.areComponentsReady()) return;

      const context = new CycleContext(Date.now());
      runSingleCycle(this.memory, this.reasoner, this.selector, context);

      if (this.cycleCallback) {
        this.cycleCallback();
      }
    } catch (error) {
      WebSocketUtils.error('Error in reasoning cycle:', error);
    }
  }

  areComponentsReady() {
    return this.memory && this.reasoner && this.selector;
  }

  loadInitialTasks() {
    try {
      const initialTasks = this.getInitialTasks();

      for (const taskData of initialTasks) {
        if (!taskData.content) {
          WebSocketUtils.warn('Task missing content, skipping:', taskData);
          continue;
        }

        this.createAndAddTask(taskData);
      }
    } catch (error) {
      WebSocketUtils.error('Error loading initial tasks:', error);
    }
  }

  createAndAddTask(taskData) {
    try {
      const { term, truth } = this.parseTaskContent(taskData.content, taskData.truth);

      const punctuation = taskData.punctuation ||
        this.inferPunctuation(taskData.content);

      const task = new Task(
        term,
        punctuation,
        truth,
        taskData.createdAt || Date.now(),
        taskData.occurrenceTime || Date.now(),
        taskData.priority || 0.5
      );

      task.id = taskData.id;
      this.memory.addTask(task, Date.now());
      WebSocketUtils.debug(`Loaded task: ${taskData.content}`);
    } catch (taskError) {
      WebSocketUtils.error('Error creating task:', taskError, taskData);
    }
  }

  parseTaskContent(content, truthValue = null) {
    const cleanContent = content.replace(/[.!?:]+$/, '').trim();

    const impMatch = cleanContent.match(/\(([^(]+)-->([^)]+)\)/);
    if (impMatch) {
      return this.createInheritanceTerm(impMatch[1].trim(), impMatch[2].trim(), truthValue);
    }

    return this.createAtomicTerm(cleanContent, truthValue);
  }

  createInheritanceTerm(subject, predicate, truthValue) {
    const subjTerm = Term.newAtom(subject);
    const predTerm = Term.newAtom(predicate);
    const term = Term.createCompound(TermType.INHERITANCE, [subjTerm, predTerm]);

    const truth = this.normalizeTruthValue(truthValue, 0.8, 0.8);

    return { term, truth };
  }

  createAtomicTerm(content, truthValue) {
    const term = Term.newAtom(content);
    const truth = this.normalizeTruthValue(truthValue, 0.5, 0.5);

    return { term, truth };
  }

  normalizeTruthValue(truthValue, defaultFreq, defaultConf) {
    if (!truthValue) {
      return new TruthValue(defaultFreq, defaultConf);
    }

    if (typeof truthValue === 'object' && !truthValue.hasOwnProperty('frequency')) {
      return new TruthValue(truthValue.frequency || defaultFreq, truthValue.confidence || defaultConf);
    }

    return truthValue;
  }

  inferPunctuation(content) {
    if (content.endsWith('!')) return '!';
    if (content.endsWith('?')) return '?';
    return '.';
  }

  getInitialTasks() {
    return [
      {
        id: 'task-1',
        content: '(a-->b).',
        priority: 0.9,
        status: 'Input',
        type: 'Input',
        createdAt: Date.now(),
        lastModified: Date.now()
      },
      {
        id: 'task-2',
        content: '(b-->c).',
        priority: 0.8,
        status: 'Input',
        type: 'Input',
        createdAt: Date.now(),
        lastModified: Date.now()
      }
    ];
  }

  stopReasoningCycle() {
    if (this.reasoningInterval) {
      clearInterval(this.reasoningInterval);
      this.reasoningInterval = null;
    }
  }

  reset() {
    this.stopReasoningCycle();
    if (this.memory?.reset) {
      this.memory.reset();
    }
    this.loadInitialTasks();
  }

  getStats() {
    return {
      isRunning: !!this.reasoningInterval,
      interval: this.reasoningInterval ? 1000 : null,
      hasCallback: !!this.cycleCallback,
      componentsReady: this.areComponentsReady()
    };
  }
}

export default ReasoningManager;