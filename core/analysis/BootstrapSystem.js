import Component from '../base/Component.js';
import { Logger } from '../base/utilities.js';
import { DEFAULTS } from '../base/constants.js';
import chokidar from 'chokidar';

/**
 * BootstrapSystem - Self-directed development system
 * 
 * Implements a 4-phase bootstrap process:
 * 1. Basic Plan Reading: Reads development plans from various sources
 * 2. Cognitive Processing: Converts plans to cognitive tasks and goals
 * 3. Active Development: Executes goals using system planning components
 * 4. Self-Improvement Loop: Iteratively improves the system based on feedback
 */
class BootstrapSystem extends Component {
  constructor() {
    super();
    
    // System references (will be injected after initialization)
    this.lm = null; // Language Model for plan processing
    this.planProcessor = null; // Plan processor for goal extraction
    this.htnPlanner = null; // HTN Planner for goal decomposition
    this.system = null; // Main system component for execution
    
    // File watching
    this.fileWatcher = null;
    this.watchedFiles = new Set();
    
    // Bootstrap state
    this.bootstrapPhase = 'initial'; // initial, reading, processing, active, improvement
    this.bootstrapGoals = [];
    this.completedGoals = [];
    this.failedGoals = [];
    this.planSources = [];
    this.isBootstrapActive = false;
    
    // Configuration
    this.config = {
      maxBootstrapIterations: DEFAULTS.BOOTSTRAP_MAX_ITERATIONS || 100,
      goalConfidenceThreshold: DEFAULTS.BOOTSTRAP_GOAL_CONFIDENCE_THRESHOLD || 0.7,
      enableSelfImprovement: DEFAULTS.BOOTSTRAP_ENABLE_SELF_IMPROVEMENT || true,
      watchPlanFiles: DEFAULTS.BOOTSTRAP_WATCH_PLAN_FILES || true // Enable/disable file watching
    };
    
    // Statistics
    this.stats = {
      bootstrapIterations: 0,
      goalsProcessed: 0,
      goalsCompleted: 0,
      plansProcessed: 0,
      selfImprovements: 0
    };
  }

  async initialize(config = {}) {
    await super.initialize(config);
    
    // Apply configuration
    this.config = { ...this.config, ...config };
    
    // Reset state
    this.bootstrapPhase = 'initial';
    this.bootstrapGoals = [];
    this.completedGoals = [];
    this.failedGoals = [];
    this.planSources = [];
    this.isBootstrapActive = false;
    this.watchedFiles.clear();
    
    // Reset statistics
    this.stats = {
      bootstrapIterations: 0,
      goalsProcessed: 0,
      goalsCompleted: 0,
      plansProcessed: 0,
      selfImprovements: 0
    };
  }

  /**
   * Set component references after core is initialized
   */
  setupDependencies(lm, planProcessor, htnPlanner, system) {
    this.lm = lm;
    this.planProcessor = planProcessor;
    this.htnPlanner = htnPlanner;
    this.system = system;
  }

  /**
   * Start the bootstrap process
   */
  async start() {
    if (this.isBootstrapActive) {
      Logger.warn('Bootstrap system is already active');
      return;
    }

    this.isBootstrapActive = true;
    Logger.info('Starting bootstrap process');
    
    // Start watching plan files if enabled
    if (this.config.watchPlanFiles) {
      this._setupFileWatching();
    }
    
    try {
      await this._executeBootstrapCycle();
    } catch (error) {
      Logger.error('Bootstrap system error', error);
      this.isBootstrapActive = false;
      throw error;
    }
  }

  /**
   * Stop the bootstrap process
   */
  async stop() {
    this.isBootstrapActive = false;
    
    // Stop file watching if active
    if (this.fileWatcher) {
      await this._stopFileWatching();
    }
    
    Logger.info('Bootstrap system stopped');
  }

  /**
   * Execute a single bootstrap cycle for testing purposes
   */
  async executeSingleCycle() {
    if (!this.isBootstrapActive) {
      return null;
    }
    
    this.stats.bootstrapIterations++;
    
    try {
      // Phase 1: Basic Plan Reading
      await this._basicPlanReading();
      
      // Phase 2: Cognitive Processing
      await this._cognitiveProcessing();
      
      // Phase 3: Active Development
      await this._activeDevelopment();
      
      // Phase 4: Self-Improvement Loop (if enabled)
      if (this.config.enableSelfImprovement) {
        await this._selfImprovementLoop();
      }
      
      return {
        iteration: this.stats.bootstrapIterations,
        goalsProcessed: this.stats.goalsProcessed,
        goalsCompleted: this.stats.goalsCompleted
      };
    } catch (error) {
      Logger.error('Error in bootstrap cycle', error);
      this.failedGoals.push({
        error: error.message,
        iteration: this.stats.bootstrapIterations,
        timestamp: Date.now()
      });
      
      return null;
    }
  }

  /**
   * Add a plan source for bootstrap processing
   */
  addPlanSource(source, type = 'file') {
    this.planSources.push({
      source,
      type,
      addedAt: Date.now()
    });
  }

  /**
   * Execute a complete bootstrap cycle
   */
  async _executeBootstrapCycle() {
    while (this.isBootstrapActive && 
           this.stats.bootstrapIterations < this.config.maxBootstrapIterations) {
      
      this.stats.bootstrapIterations++;
      
      try {
        // Phase 1: Basic Plan Reading
        await this._basicPlanReading();
        
        // Phase 2: Cognitive Processing
        await this._cognitiveProcessing();
        
        // Phase 3: Active Development
        await this._activeDevelopment();
        
        // Phase 4: Self-Improvement Loop (if enabled)
        if (this.config.enableSelfImprovement) {
          await this._selfImprovementLoop();
        }
        
        // Check if bootstrap goals are completed
        if (await this._bootstrapGoalsCompleted()) {
          Logger.info('Bootstrap goals completed');
          break;
        }
        
        // Small delay to prevent overwhelming the system
        // In test environment, use shorter delay to avoid timeouts
        const delayMs = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined ? 10 : 100;
        await this._delay(delayMs);
        
      } catch (error) {
        Logger.error('Error in bootstrap cycle', error);
        this.failedGoals.push({
          error: error.message,
          iteration: this.stats.bootstrapIterations,
          timestamp: Date.now()
        });
        
        // Continue with next iteration even if one fails
        continue;
      }
    }
  }

  /**
   * Phase 1: Basic Plan Reading
   * Reads development plans from various sources
   */
  async _basicPlanReading() {
    this.bootstrapPhase = 'reading';
    Logger.debug('Bootstrap phase: Basic Plan Reading');
    
    if (!this.planProcessor) {
      Logger.warn('PlanProcessor not available, skipping plan reading');
      return;
    }
    
    for (const planSource of this.planSources) {
      try {
        // Process the plan document
        const result = await this.planProcessor.processDocument(
          planSource.source, 
          planSource.type
        );
        
        // Add extracted goals to bootstrap goals
        this.bootstrapGoals.push(...result.goals);
        this.stats.plansProcessed++;
        
        Logger.debug(`Processed plan source: ${planSource.source}`, {
          goalsExtracted: result.goals.length,
          planSource: planSource.source
        });
      } catch (error) {
        Logger.error(`Error processing plan source ${planSource.source}`, error);
        continue;
      }
    }
  }

  /**
   * Phase 2: Cognitive Processing
   * Converts plans to cognitive tasks and sets goals
   */
  async _cognitiveProcessing() {
    this.bootstrapPhase = 'processing';
    Logger.debug('Bootstrap phase: Cognitive Processing');
    
    if (!this.planProcessor) {
      Logger.warn('PlanProcessor not available, skipping cognitive processing');
      return;
    }
    
    // Convert goals to cognitive tasks
    const tasks = this.planProcessor.convertGoalsToTasks(this.bootstrapGoals);
    
    // Filter tasks by confidence threshold
    const highConfidenceTasks = tasks.filter(task => 
      task.truth?.frequency >= this.config.goalConfidenceThreshold
    );
    
    // Add tasks to the system for processing
    for (const task of highConfidenceTasks) {
      try {
        if (this.system) {
          this.system.input(task);
          this.stats.goalsProcessed++;
        }
      } catch (error) {
        Logger.error(`Error adding task to system: ${task.term}`, error);
      }
    }
  }

  /**
   * Phase 3: Active Development
   * Executes goals using system planning components
   */
  async _activeDevelopment() {
    this.bootstrapPhase = 'active';
    Logger.debug('Bootstrap phase: Active Development');
    
    // For each bootstrap goal, attempt to create and execute a plan
    for (const goal of this.bootstrapGoals) {
      if (this.htnPlanner) {
        try {
          // Create a plan for the goal
          const plan = await this.htnPlanner.plan(goal.text, {
            goal: goal,
            context: 'bootstrap'
          });
          
          if (plan) {
            // Execute the plan
            const result = await this.htnPlanner.executePlan(plan, {
              goal: goal,
              context: 'bootstrap'
            });
            
            if (result.success) {
              this.completedGoals.push({
                goal: goal.text,
                plan,
                completedAt: Date.now()
              });
              this.stats.goalsCompleted++;
            } else {
              this.failedGoals.push({
                goal: goal.text,
                error: result.reason,
                failedAt: Date.now()
              });
            }
          } else {
            Logger.debug(`No plan found for goal: ${goal.text}`);
          }
        } catch (error) {
          Logger.error(`Error executing plan for goal: ${goal.text}`, error);
          this.failedGoals.push({
            goal: goal.text,
            error: error.message,
            failedAt: Date.now()
          });
        }
      }
    }
  }

  /**
   * Phase 4: Self-Improvement Loop
   * Iteratively improves the system based on feedback
   */
  async _selfImprovementLoop() {
    this.bootstrapPhase = 'improvement';
    Logger.debug('Bootstrap phase: Self-Improvement Loop');
    
    if (!this.lm) {
      Logger.warn('Language Model not available, skipping self-improvement');
      return;
    }
    
    try {
      // Generate self-improvement suggestions based on completed/failed goals
      const improvementTasks = await this._generateImprovementTasks();
      
      for (const task of improvementTasks) {
        if (this.system) {
          this.system.input(task);
        }
        this.stats.selfImprovements++;
      }
    } catch (error) {
      Logger.error('Error in self-improvement loop', error);
    }
  }

  /**
   * Generate improvement tasks based on system performance
   */
  async _generateImprovementTasks() {
    const prompt = `
      Analyze the following bootstrap system performance:
      
      - Completed goals: ${this.completedGoals.length}
      - Failed goals: ${this.failedGoals.length}
      - Total goals: ${this.bootstrapGoals.length}
      - Bootstrap iterations: ${this.stats.bootstrapIterations}
      - Goals processed: ${this.stats.goalsProcessed}
      
      Generate 3-5 specific improvement goals that the system should focus on next.
      Return them as a JSON array of goal objects with the following structure:
      [
        {
          "text": "improvement goal description",
          "priority": 0.8,
          "confidence": 0.9
        }
      ]
    `;
    
    try {
      const response = await this.lm.generateText(prompt, {
        temperature: 0.4,
        maxTokens: 300
      });
      
      let improvementGoals;
      try {
        // Try to parse the response as JSON
        const jsonStart = response.indexOf('[');
        const jsonEnd = response.lastIndexOf(']') + 1;
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          improvementGoals = JSON.parse(response.substring(jsonStart, jsonEnd));
        } else {
          const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
          improvementGoals = JSON.parse(cleaned);
        }
      } catch (parseError) {
        Logger.warn('Self-improvement response parsing failed', parseError);
        return []; // Return empty array if parsing fails
      }
      
      // Convert improvement goals to tasks
      return improvementGoals.map(goal => ({
        term: `({SELF} * {${this._sanitizeTerm(goal.text)}})`,
        type: 'goal',
        punctuation: '!',
        truth: {
          frequency: goal.confidence || 0.8,
          confidence: 0.9
        },
        priority: goal.priority || 0.7,
        creationTime: Date.now(),
        source: 'BootstrapSystem',
        metadata: {
          originalText: goal.text,
          source: 'self_improvement',
          confidence: goal.confidence || 0.8
        }
      }));
    } catch (error) {
      Logger.error('Error generating improvement tasks', error);
      return [];
    }
  }

  /**
   * Check if bootstrap goals are completed
   */
  async _bootstrapGoalsCompleted() {
    // In a more sophisticated implementation, this would check if
    // the primary bootstrap goals have been achieved
    const completionRate = this.completedGoals.length / 
                          Math.max(1, this.completedGoals.length + this.failedGoals.length);
    
    // If we have completed a significant portion of goals, consider bootstrap complete
    return completionRate > 0.8 || this.stats.bootstrapIterations > this.config.maxBootstrapIterations * 0.9;
  }

  /**
   * Sanitize text to create valid NARS terms
   */
  _sanitizeTerm(text) {
    // Remove special characters that are meaningful in NARS syntax
    return text
      .replace(/[(){}<>,.!?]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 50) // Limit length
      .replace(/_+/g, '_') // Remove multiple underscores
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  }

  /**
   * Delay helper function
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get bootstrap system statistics
   */
  getStats() {
    return {
      ...this.stats,
      bootstrapPhase: this.bootstrapPhase,
      isBootstrapActive: this.isBootstrapActive,
      totalGoals: this.bootstrapGoals.length,
      completedGoalCount: this.completedGoals.length,
      failedGoalCount: this.failedGoals.length,
      planSourcesCount: this.planSources.length,
      completionRate: this.bootstrapGoals.length > 0 ? 
        this.completedGoals.length / this.bootstrapGoals.length : 0
    };
  }

  /**
   * Get current bootstrap status
   */
  getStatus() {
    return {
      phase: this.bootstrapPhase,
      isActive: this.isBootstrapActive,
      stats: this.getStats(),
      goals: {
        total: this.bootstrapGoals.length,
        completed: this.completedGoals.length,
        failed: this.failedGoals.length
      },
      config: this.config
    };
  }

  /**
   * Add a specific bootstrap goal directly
   */
  addBootstrapGoal(text, priority = 0.8, confidence = 0.9) {
    const goal = {
      text,
      priority,
      confidence,
      addedAt: Date.now(),
      source: 'direct'
    };
    
    this.bootstrapGoals.push(goal);
    return goal;
  }

  /**
   * Reset the bootstrap system
   */
  reset() {
    this.bootstrapPhase = 'initial';
    this.bootstrapGoals = [];
    this.completedGoals = [];
    this.failedGoals = [];
    this.planSources = [];
    this.stats = {
      bootstrapIterations: 0,
      goalsProcessed: 0,
      goalsCompleted: 0,
      plansProcessed: 0,
      selfImprovements: 0
    };
  }
  
  /**
   * Set up file watching for plan sources
   */
  _setupFileWatching() {
    if (this.fileWatcher) {
      // Already watching, just add new files
      this._addFilesToWatcher();
      return;
    }
    
    try {
      // Initialize watcher
      this.fileWatcher = chokidar.watch([], {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true // Don't emit events for initial files
      });
      
      // Add initial file paths
      this._addFilesToWatcher();
      
      // Set up event handlers
      this.fileWatcher
        .on('change', (path) => {
          Logger.info(`Plan file changed: ${path}`);
          this._handleFileChange(path);
        })
        .on('add', (path) => {
          Logger.info(`New plan file added: ${path}`);
          this._handleFileChange(path);
        })
        .on('error', (error) => {
          Logger.error('File watcher error', error);
        });
        
      Logger.info('File watching initialized for plan files');
    } catch (error) {
      Logger.error('Failed to initialize file watching', error);
    }
  }
  
  /**
   * Add current plan source files to the watcher
   */
  _addFilesToWatcher() {
    if (!this.fileWatcher) return;
    
    // Add file paths that are of type 'file'
    for (const planSource of this.planSources) {
      if (planSource.type === 'file' && !this.watchedFiles.has(planSource.source)) {
        this.fileWatcher.add(planSource.source);
        this.watchedFiles.add(planSource.source);
        Logger.debug(`Added file to watcher: ${planSource.source}`);
      }
    }
  }
  
  /**
   * Handle file change event
   */
  async _handleFileChange(filePath) {
    Logger.info(`Processing updated plan file: ${filePath}`);
    
    // Add a small delay to ensure file is completely written
    await this._delay(100);
    
    try {
      // Process the updated file
      if (this.planProcessor) {
        const result = await this.planProcessor.processDocument(filePath, 'file');
        
        // Add extracted goals to bootstrap goals
        this.bootstrapGoals.push(...result.goals);
        this.stats.plansProcessed++;
        
        Logger.info(`Processed updated plan file: ${filePath}`, {
          goalsExtracted: result.goals.length
        });
      }
    } catch (error) {
      Logger.error(`Error processing changed file: ${filePath}`, error);
    }
  }
  
  /**
   * Stop file watching
   */
  async _stopFileWatching() {
    if (this.fileWatcher) {
      try {
        await this.fileWatcher.close();
        this.fileWatcher = null;
        this.watchedFiles.clear();
        Logger.info('File watching stopped');
      } catch (error) {
        Logger.error('Error stopping file watcher', error);
      }
    }
  }
}

export default BootstrapSystem;