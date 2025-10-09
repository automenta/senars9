import Component from '../base/Component.js';
import { Logger } from '../base/utilities.js';
import { DEFAULTS } from '../base/constants.js';

/**
 * PlanProcessor - Extracts goals from documents and converts them to cognitive tasks
 * 
 * This component processes various document formats (Markdown, JSON, YAML, etc.) to:
 * 1. Extract natural language goals
 * 2. Convert them to cognitive tasks
 * 3. Analyze dependencies between extracted goals
 * 4. Prioritize goals using cognitive reasoning
 * 5. Assign self-directed work to system components
 */
class PlanProcessor extends Component {
  constructor(lm = null, htnPlanner = null) {
    super();
    this.lm = lm; // Language Model component for NLP tasks
    this.htnPlanner = htnPlanner; // HTN Planner for goal decomposition
    
    // Supported document formats
    this.supportedFormats = {
      '.md': 'markdown',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.txt': 'text',
      '.js': 'javascript',
      '.ts': 'typescript'
    };
    
    // Goal extraction patterns
    this.goalPatterns = [
      /to achieve (.+?)(?:,|\.|;)/gi,
      /goal(?: is to)? (.+?)(?:,|\.|;)/gi,
      /objective(?: is)? (.+?)(?:,|\.|;)/gi,
      /aim(?: is to)? (.+?)(?:,|\.|;)/gi,
      /need to (.+?)(?:,|\.|;)/gi,
      /want to (.+?)(?:,|\.|;)/gi,
      /should (.+?)(?:,|\.|;)/gi,
      /must (.+?)(?:,|\.|;)/gi,
      /will (.+?)(?:,|\.|;)/gi
    ];
    
    // Dependency keywords for analyzing goal relationships
    this.dependencyKeywords = [
      'depends on',
      'requires',
      'after',
      'before',
      'first',
      'then',
      'once',
      'when',
      'if',
      'prerequisite',
      'precondition'
    ];
    
    // Configuration
    this.config = {
      maxGoals: DEFAULTS.PLAN_PROCESSOR_MAX_GOALS || 50,
      confidenceThreshold: DEFAULTS.PLAN_PROCESSOR_CONFIDENCE_THRESHOLD || 0.7,
      enableLMProcessing: DEFAULTS.PLAN_PROCESSOR_ENABLE_LM || true
    };
    
    // Statistics
    this.stats = {
      documentsProcessed: 0,
      goalsExtracted: 0,
      goalsConverted: 0,
      dependenciesAnalyzed: 0,
      lmProcessings: 0
    };
  }

  async initialize(config = {}) {
    await super.initialize(config);
    
    // Apply configuration
    this.config = { ...this.config, ...config };
    
    // Reset statistics
    this.stats = {
      documentsProcessed: 0,
      goalsExtracted: 0,
      goalsConverted: 0,
      dependenciesAnalyzed: 0,
      lmProcessings: 0
    };
  }

  /**
   * Process a document and extract goals
   * @param {string|Object} document - Document content or path to document
   * @param {string} format - Document format (optional, auto-detected from extension if file path)
   * @param {Object} options - Processing options
   * @returns {Object} Extracted goals and metadata
   */
  async processDocument(document, format = null, options = {}) {
    let content;
    let detectedFormat = format;

    // Determine if document is a file path or content
    if (typeof document === 'string') {
      // Check if this looks like a file path (contains dot and follows file naming pattern)
      // but only if it's not a short string that could be actual content
      if (document.length > 10 && document.includes('.') && document.includes('/')) {
        // This looks like a file path
        const extension = document.substring(document.lastIndexOf('.')).toLowerCase();
        detectedFormat = detectedFormat || this.supportedFormats[extension];
        content = await this._readDocumentFromFile(document);
      } else {
        // This is likely content, not a file path
        content = document;
        detectedFormat = detectedFormat || 'text'; // Default to text if no format specified
      }
    } else {
      // If document is an object (like JSON), handle as content
      content = JSON.stringify(document);
      detectedFormat = detectedFormat || 'json';
    }

    if (!detectedFormat) {
      throw new Error('Document format not detected or specified');
    }

    this.stats.documentsProcessed++;

    // Process based on format
    let goals = [];
    switch (detectedFormat) {
      case 'markdown':
        goals = await this._processMarkdown(content, options);
        break;
      case 'json':
        goals = await this._processJSON(content, options);
        break;
      case 'yaml':
        goals = await this._processYAML(content, options);
        break;
      case 'text':
      case 'javascript':
      case 'typescript':
        goals = await this._processText(content, options);
        break;
      default:
        throw new Error(`Unsupported document format: ${detectedFormat}`);
    }

    // Filter goals based on confidence threshold
    const filteredGoals = goals.filter(goal => goal.confidence >= this.config.confidenceThreshold);

    // Analyze dependencies between goals
    const dependencies = await this._analyzeDependencies(filteredGoals, options);

    // Prioritize goals using cognitive reasoning
    const prioritizedGoals = await this._prioritizeGoals(filteredGoals, dependencies, options);

    return {
      goals: prioritizedGoals,
      dependencies,
      metadata: {
        format: detectedFormat,
        totalGoals: goals.length,
        filteredGoals: filteredGoals.length,
        confidenceThreshold: this.config.confidenceThreshold,
        timestamp: Date.now()
      }
    };
  }

  /**
   * Process a markdown document
   * @private
   */
  async _processMarkdown(content, options) {
    // Extract headers as potential goals
    const headerGoals = this._extractFromHeaders(content, options);
    
    // Extract from regular text
    const textGoals = await this._extractFromText(content, options);
    
    return [...headerGoals, ...textGoals];
  }

  /**
   * Process a JSON document
   * @private
   */
  async _processJSON(content, options) {
    let data;
    
    try {
      data = typeof content === 'string' ? JSON.parse(content) : content;
    } catch (error) {
      throw new Error('Invalid JSON content');
    }

    // Extract goals from specific JSON fields
    const goals = [];
    
    // Look for common goal-related keys
    const goalKeys = ['goal', 'goals', 'objective', 'objectives', 'task', 'tasks', 'plan', 'plans', 'todo', 'todos'];
    
    for (const key of goalKeys) {
      if (data[key]) {
        const extracted = this._extractGoalsFromJSONData(data[key], key);
        goals.push(...extracted);
      }
    }
    
    return goals;
  }

  /**
   * Process a YAML document
   * @private
   */
  async _processYAML(content, options) {
    // For now, we'll use a simple approach - in a real implementation you'd use a YAML parser
    // This is a simplified approach for demonstration
    const lines = content.split('\n');
    const goals = [];
    
    for (const line of lines) {
      // Look for YAML key-value pairs that might contain goals
      const match = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.+)$/);
      if (match) {
        const key = match[1].toLowerCase();
        const value = match[2].trim();
        
        if (['goal', 'objective', 'task', 'todo', 'plan'].includes(key)) {
          goals.push({
            text: value,
            source: `YAML:${key}`,
            confidence: 0.8,
            priority: 0.5,
            timestamp: Date.now()
          });
        }
      }
    }
    
    // Extract from text content as well
    const textGoals = await this._extractFromText(content, options);
    return [...goals, ...textGoals];
  }

  /**
   * Process plain text document
   * @private
   */
  async _processText(content, options) {
    return await this._extractFromText(content, options);
  }

  /**
   * Extract goals from document headers (for markdown)
   * @private
   */
  _extractFromHeaders(content, options) {
    const goals = [];
    const headerRegex = /^(#{1,6})\s+(.+)$/gm;
    let match;

    while ((match = headerRegex.exec(content)) !== null) {
      const level = match[1].length; // Number of # symbols
      const headerText = match[2].trim();

      // Headers with higher level (more #) are typically lower priority goals
      const priority = Math.max(0.1, 1.0 - (level - 1) * 0.15); // # = 1.0, ## = 0.85, ..., ###### = 0.25

      // Check if header text matches goal patterns
      for (const pattern of this.goalPatterns) {
        pattern.lastIndex = 0; // Reset regex state
        const goalMatch = pattern.exec(headerText);
        if (goalMatch) {
          goals.push({
            text: goalMatch[1],
            source: `header-level-${level}`,
            confidence: Math.min(1.0, priority + 0.2), // Higher if it matches pattern
            priority,
            timestamp: Date.now()
          });
          break; // Only add once per header
        }
      }

      // If header doesn't match patterns but is high-level, consider it a goal anyway
      if (level <= 2) { // H1 and H2 are likely important goals
        goals.push({
          text: headerText,
          source: `header-level-${level}`,
          confidence: priority,
          priority,
          timestamp: Date.now()
        });
      }
    }

    return goals;
  }

  /**
   * Extract goals from text content using patterns
   * @private
   */
  async _extractFromText(content, options) {
    const goals = [];
    const uniqueGoals = new Map(); // To avoid duplicates

    // Use pattern-based extraction
    for (const pattern of this.goalPatterns) {
      let match;
      pattern.lastIndex = 0; // Reset regex state
      
      while ((match = pattern.exec(content)) !== null) {
        const goalText = match[1].trim();
        
        // Skip if empty or already processed
        if (!goalText || uniqueGoals.has(goalText.toLowerCase())) {
          continue;
        }

        // Basic confidence based on pattern match strength
        let confidence = 0.7;
        
        // Boost confidence if the goal appears to have action words
        const actionWords = ['implement', 'create', 'build', 'develop', 'design', 'test', 'deploy', 'optimize'];
        if (actionWords.some(word => goalText.toLowerCase().includes(word))) {
          confidence = Math.min(1.0, confidence + 0.15);
        }

        const goal = {
          text: goalText,
          source: 'pattern_match',
          confidence,
          priority: 0.5,
          timestamp: Date.now()
        };

        goals.push(goal);
        uniqueGoals.set(goalText.toLowerCase(), goal);
      }
    }

    // If LM is available and enabled, use it for better extraction
    if (this.lm && this.config.enableLMProcessing) {
      const enhancedGoals = await this._extractWithLM(content, goals, options);
      return enhancedGoals;
    }

    return goals;
  }

  /**
   * Extract goals using Language Model for better understanding
   * @private
   */
  async _extractWithLM(content, existingGoals, options) {
    this.stats.lmProcessings++;

    try {
      // Create a prompt for the LM to extract goals
      const prompt = `
Extract specific, actionable goals from the following document content. 
Return them in a structured format. Goals should be specific objectives that can be planned and executed.

Document content:
${content}

Return the goals as a JSON array of objects with the following structure:
[
  {
    "text": "goal description",
    "confidence": 0.8,
    "priority": 0.6
  }
]

Keep goals specific, actionable, and avoid duplicates.
`;

      const response = await this.lm.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 500
      });

      let extractedGoals;
      try {
        // Try to parse the response as JSON
        const jsonStart = response.indexOf('[');
        const jsonEnd = response.lastIndexOf(']') + 1;
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          extractedGoals = JSON.parse(response.substring(jsonStart, jsonEnd));
        } else {
          // If no JSON found, try to parse as plain array format
          const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
          extractedGoals = JSON.parse(cleaned);
        }
      } catch (parseError) {
        Logger.warn('LM response parsing failed, using pattern-based goals', parseError);
        return existingGoals;
      }

      // Process the LM-extracted goals
      const processedGoals = extractedGoals.map(goal => ({
        text: goal.text,
        source: 'lm_extraction',
        confidence: goal.confidence || 0.8,
        priority: goal.priority || 0.5,
        timestamp: Date.now()
      }));

      // Combine with existing goals, avoiding duplicates
      const allGoals = [...existingGoals];
      const textSet = new Set(existingGoals.map(g => g.text.toLowerCase()));

      for (const goal of processedGoals) {
        if (!textSet.has(goal.text.toLowerCase())) {
          allGoals.push(goal);
          textSet.add(goal.text.toLowerCase());
        }
      }

      // Update statistics
      this.stats.goalsExtracted += processedGoals.length;

      return allGoals;
    } catch (error) {
      Logger.error('LM-based goal extraction failed, using pattern-based results', error);
      return existingGoals; // Fallback to pattern-based extraction
    }
  }

  /**
   * Read document from file
   * @private
   */
  async _readDocumentFromFile(filePath) {
    // This is a placeholder - in Node.js you'd use fs.promises.readFile
    // For now, we'll throw an error since we need to implement proper file reading
    throw new Error(`File reading not implemented for path: ${filePath}`);
  }

  /**
   * Extract goals from JSON data structure
   * @private
   */
  _extractGoalsFromJSONData(data, parentKey = '') {
    const goals = [];

    if (Array.isArray(data)) {
      // Handle arrays
      for (const item of data) {
        goals.push(...this._extractGoalsFromJSONData(item, parentKey));
      }
    } else if (typeof data === 'object' && data !== null) {
      // Handle objects
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          // Check if the value looks like a goal
          for (const pattern of this.goalPatterns) {
            pattern.lastIndex = 0; // Reset regex state
            const match = pattern.exec(value);
            if (match) {
              goals.push({
                text: match[1],
                source: `JSON:${parentKey}.${key}`,
                confidence: 0.8,
                priority: 0.5,
                timestamp: Date.now()
              });
              break; // Only add once per value
            }
          }
          
          // If not a pattern match, but the key suggests it's a goal
          if (['name', 'description', 'title'].includes(key.toLowerCase())) {
            goals.push({
              text: value,
              source: `JSON:${parentKey}.${key}`,
              confidence: 0.6,
              priority: 0.5,
              timestamp: Date.now()
            });
          }
        } else {
          // Recursively process nested objects
          goals.push(...this._extractGoalsFromJSONData(value, `${parentKey}.${key}`));
        }
      }
    } else if (typeof data === 'string') {
      // Handle string values that might be goals
      for (const pattern of this.goalPatterns) {
        pattern.lastIndex = 0; // Reset regex state
        const match = pattern.exec(data);
        if (match) {
          goals.push({
            text: match[1],
            source: `JSON:${parentKey}`,
            confidence: 0.7,
            priority: 0.5,
            timestamp: Date.now()
          });
          break; // Only add once per string
        }
      }
    }

    return goals;
  }

  /**
   * Analyze dependencies between extracted goals
   * @private
   */
  async _analyzeDependencies(goals, options) {
    this.stats.dependenciesAnalyzed++;

    // Create a dependency map
    const dependencies = {};
    
    for (let i = 0; i < goals.length; i++) {
      const goalA = goals[i];
      dependencies[goalA.text] = [];

      for (let j = 0; j < goals.length; j++) {
        if (i === j) continue;

        const goalB = goals[j];
        
        // Check if goalA depends on goalB using dependency keywords
        if (this._checkDependency(goalA.text, goalB.text)) {
          dependencies[goalA.text].push(goalB.text);
        }
      }
    }

    // If LM is available, use it for more sophisticated dependency analysis
    if (this.lm && this.config.enableLMProcessing) {
      return await this._analyzeDependenciesWithLM(goals, dependencies, options);
    }

    return dependencies;
  }

  /**
   * Check if goalA depends on goalB based on keywords
   * @private
   */
  _checkDependency(goalA, goalB) {
    const goalLowerA = goalA.toLowerCase();
    const goalLowerB = goalB.toLowerCase();

    for (const keyword of this.dependencyKeywords) {
      if (goalLowerA.includes(keyword) && goalLowerB.includes(keyword.split(' ')[0])) {
        // More specific check: if goalA mentions goalB or related terms
        return true;
      }
    }

    // Simple overlap check (if goals share common terms, they might be related)
    const wordsA = goalLowerA.split(/\s+/);
    const wordsB = goalLowerB.split(/\s+/);
    const commonWords = wordsA.filter(word => 
      wordsB.includes(word) && 
      !['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word)
    );

    return commonWords.length >= 2; // If 2 or more meaningful words overlap
  }

  /**
   * Analyze dependencies using Language Model
   * @private
   */
  async _analyzeDependenciesWithLM(goals, existingDependencies, options) {
    this.stats.lmProcessings++;

    try {
      const goalsText = goals.map((g, i) => `Goal ${i + 1}: ${g.text}`).join('\n');
      
      const prompt = `
Analyze the dependencies between the following goals. A dependency exists when one goal must be completed before another can begin.

Goals:
${goalsText}

Return the dependencies as a JSON object where each key is a goal and the value is an array of goals it depends on:

{
  "Goal text 1": ["Dependent goal 1", "Dependent goal 2"],
  "Goal text 2": [],
  ...
}

Only include actual dependencies, not related goals.
`;

      const response = await this.lm.generateText(prompt, {
        temperature: 0.2,
        maxTokens: 600
      });

      let dependencyAnalysis;
      try {
        // Try to parse the response as JSON
        const jsonStart = response.indexOf('{');
        const jsonEnd = response.lastIndexOf('}') + 1;
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          dependencyAnalysis = JSON.parse(response.substring(jsonStart, jsonEnd));
        } else {
          const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
          dependencyAnalysis = JSON.parse(cleaned);
        }
      } catch (parseError) {
        Logger.warn('Dependency analysis parsing failed', parseError);
        return existingDependencies;
      }

      // Merge with existing dependencies
      const finalDependencies = { ...existingDependencies };
      for (const [goal, deps] of Object.entries(dependencyAnalysis)) {
        if (Array.isArray(deps)) {
          // Find the actual goal text from our goals array
          const actualGoal = goals.find(g => g.text.includes(goal) || goal.includes(g.text));
          if (actualGoal) {
            finalDependencies[actualGoal.text] = deps;
          } else {
            // If not found, add as is (it might be a shortened version)
            finalDependencies[goal] = deps;
          }
        }
      }

      return finalDependencies;
    } catch (error) {
      Logger.error('LM-based dependency analysis failed', error);
      return existingDependencies; // Fallback to pattern-based analysis
    }
  }

  /**
   * Prioritize goals using cognitive reasoning
   * @private
   */
  async _prioritizeGoals(goals, dependencies, options) {
    // If HTN planner is available, use it to assess goal feasibility
    if (this.htnPlanner) {
      for (const goal of goals) {
        // Try to create a simple plan for the goal to assess feasibility
        try {
          // This is a simplified assessment - in reality you'd need to convert 
          // natural language goals to formal tasks
          const complexity = this._estimateGoalComplexity(goal.text, dependencies);
          goal.priority = Math.max(0.1, Math.min(1.0, 1.0 - (complexity * 0.3) + (goal.confidence * 0.4)));
        } catch (error) {
          // If planning fails, keep original priority
          goal.priority = goal.priority || 0.5;
        }
      }
    }

    // Sort goals by priority (highest first)
    return goals.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Estimate goal complexity based on dependencies and text
   * @private
   */
  _estimateGoalComplexity(goalText, dependencies) {
    // Start with base complexity
    let complexity = 0.5;

    // Add complexity based on dependencies
    const dependencyCount = dependencies[goalText]?.length || 0;
    complexity += (dependencyCount * 0.2); // More dependencies = more complex

    // Add complexity based on text length
    if (goalText.length > 100) {
      complexity += 0.2; // Longer goals might be more complex
    }

    // Add complexity based on technical keywords
    const technicalKeywords = ['implement', 'develop', 'build', 'integrate', 'refactor', 'optimize', 'debug'];
    if (technicalKeywords.some(keyword => goalText.toLowerCase().includes(keyword))) {
      complexity += 0.2;
    }

    return Math.min(1.0, complexity);
  }

  /**
   * Convert extracted goals to cognitive tasks
   * @param {Array} goals - Array of extracted goals
   * @returns {Array} Array of cognitive tasks
   */
  convertGoalsToTasks(goals) {
    const tasks = [];
    
    for (const goal of goals) {
      // Convert to NARS task format
      const task = {
        term: `({SELF} * {${this._sanitizeTerm(goal.text)}})`,
        type: 'goal', // Could be 'goal', 'question', 'belief'
        punctuation: '!', // Goals use '!' punctuation in NARS
        truth: {
          frequency: goal.confidence,
          confidence: 0.9 // High confidence that this is a goal we want to achieve
        },
        priority: goal.priority,
        creationTime: goal.timestamp,
        source: goal.source || 'PlanProcessor',
        metadata: {
          originalText: goal.text,
          extractedFrom: goal.source,
          confidence: goal.confidence
        }
      };

      tasks.push(task);
      this.stats.goalsConverted++;
    }

    return tasks;
  }

  /**
   * Sanitize text to create valid NARS terms
   * @private
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
   * Process document and return cognitive tasks ready for system processing
   * @param {string|Object} document - Document to process
   * @param {Object} options - Processing options
   * @returns {Array} Array of cognitive tasks
   */
  async processToTasks(document, options = {}) {
    const result = await this.processDocument(document, null, options);
    
    // Convert goals to tasks
    const tasks = this.convertGoalsToTasks(result.goals);
    
    return {
      tasks,
      metadata: result.metadata,
      dependencies: result.dependencies
    };
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      ...this.stats,
      confidenceThreshold: this.config.confidenceThreshold,
      maxGoals: this.config.maxGoals,
      lmEnabled: this.config.enableLMProcessing,
      hasLM: !!this.lm,
      hasHTNPlanner: !!this.htnPlanner
    };
  }
}

export default PlanProcessor;