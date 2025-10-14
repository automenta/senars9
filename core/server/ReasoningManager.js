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

      // Use the core cycle method if available
      if (this.core?.cycle?.step) {
        this.core.cycle.step();
      } else {
        WebSocketUtils.warn('Core cycle not available, cannot execute reasoning cycle');
      }

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
      // If we have access to core memory, use its task creation methods
      if (this.core?.memory?.createTask) {
        const task = this.core.memory.createTask(taskData);
        this.core.memory.addTask(task, Date.now());
      } else if (this.memory?.createTask) {
        const task = this.memory.createTask(taskData);
        this.memory.addTask(task, Date.now());
      } else {
        // Fallback: add task data directly to memory if it supports that
        this.memory.addTask(taskData, Date.now());
      }
      
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
    // If we have access to core memory, delegate to it
    if (this.core?.memory?.createInheritanceTerm) {
      return this.core.memory.createInheritanceTerm(subject, predicate, truthValue);
    } else if (this.memory?.createInheritanceTerm) {
      return this.memory.createInheritanceTerm(subject, predicate, truthValue);
    }
    
    // Fallback handling for undefined Term objects
    try {
      // Check if Term and TermType are defined before using them
      if (typeof Term !== 'undefined' && typeof TermType !== 'undefined') {
        const subjTerm = Term.newAtom(subject);
        const predTerm = Term.newAtom(predicate);
        const term = Term.createCompound(TermType.INHERITANCE, [subjTerm, predTerm]);

        const truth = this.normalizeTruthValue(truthValue, 0.8, 0.8);

        return { term, truth };
      } else {
        // Safe fallback if Term is not available
        return { 
          term: `(${subject}-->${predicate})`, 
          truth: truthValue 
        };
      }
    } catch (error) {
      // Safe fallback if Term is not available or error occurs
      return { 
        term: `(${subject}-->${predicate})`, 
        truth: truthValue 
      };
    }
  }

  createAtomicTerm(content, truthValue) {
    // If we have access to core memory, delegate to it
    if (this.core?.memory?.createAtomicTerm) {
      return this.core.memory.createAtomicTerm(content, truthValue);
    } else if (this.memory?.createAtomicTerm) {
      return this.memory.createAtomicTerm(content, truthValue);
    }
    
    // Fallback handling for undefined Term objects
    try {
      if (typeof Term !== 'undefined') {
        const term = Term.newAtom(content);
        const truth = this.normalizeTruthValue(truthValue, 0.5, 0.5);

        return { term, truth };
      } else {
        // Safe fallback if Term is not available
        return { 
          term: content, 
          truth: truthValue 
        };
      }
    } catch (error) {
      // Safe fallback if Term is not available or error occurs
      return { 
        term: content, 
        truth: truthValue 
      };
    }
  }

  normalizeTruthValue(truthValue, defaultFreq, defaultConf) {
    // If we have access to core memory, delegate to it
    if (this.core?.memory?.normalizeTruthValue) {
      return this.core.memory.normalizeTruthValue(truthValue, defaultFreq, defaultConf);
    } else if (this.memory?.normalizeTruthValue) {
      return this.memory.normalizeTruthValue(truthValue, defaultFreq, defaultConf);
    }
    
    if (!truthValue) {
      // Check if TruthValue constructor is available
      if (typeof TruthValue !== 'undefined') {
        return new TruthValue(defaultFreq, defaultConf);
      } else {
        // Return a plain object as fallback
        return { frequency: defaultFreq, confidence: defaultConf };
      }
    }

    if (typeof truthValue === 'object' && !truthValue.hasOwnProperty('frequency')) {
      if (typeof TruthValue !== 'undefined') {
        return new TruthValue(truthValue.frequency || defaultFreq, truthValue.confidence || defaultConf);
      } else {
        // Return a plain object as fallback
        return { 
          frequency: truthValue.frequency || defaultFreq, 
          confidence: truthValue.confidence || defaultConf 
        };
      }
    }

    return truthValue;
  }

  inferPunctuation(content) {
    if (content.endsWith('!')) return '!';
    if (content.endsWith('?')) return '?';
    return '.';
  }

  getInitialTasks() {
    // If we have access to core memory, use its initial tasks
    if (this.core?.memory?.getInitialTasks) {
      return this.core.memory.getInitialTasks();
    } else if (this.memory?.getInitialTasks) {
      return this.memory.getInitialTasks();
    }
    
    // Fallback to default tasks if available
    return [];
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