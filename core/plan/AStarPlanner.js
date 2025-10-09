import Planner from './Planner.js';
import { Storage } from '../collections.js';
import { Logger } from '../utilities.js';
import { DEFAULTS } from '../constants.js';

/**
 * AStarPlanner - A* Pathfinding Algorithm for General-Purpose Graph Searching
 * 
 * Implements the A* pathfinding algorithm for finding optimal paths in weighted graphs.
 * Unlike HTN planning, this focuses on spatial or state-space pathfinding with heuristics.
 */
class AStarPlanner extends Planner {
  constructor(adjacencyBag = null) {
    super();
    
    // If adjacencyBag is provided, use it for pathfinding
    this.adjacencyBag = adjacencyBag;
    
    // Heuristic functions for different types of problems
    this.heuristics = new Map();
    
    // Configuration
    this.timeout = DEFAULTS.ASTAR_TIMEOUT || 10000; // 10 seconds default
    this.maxSteps = DEFAULTS.ASTAR_MAX_STEPS || 10000;
    
    // Additional AStar-specific statistics
    this.stats.pathsFound = 0;
    this.stats.pathsFailed = 0;
    this.stats.totalSearchSteps = 0;
    this.stats.averagePathLength = 0;
    this.stats.averageSearchTime = 0;
    
    // Register default heuristics
    this._registerDefaultHeuristics();
  }

  async initialize(config = {}) {
    await super.initialize(config);
    
    // Apply configuration
    this.timeout = config.timeout ?? this.timeout;
    this.maxSteps = config.maxSteps ?? this.maxSteps;
    
    // Reset statistics using inherited base stats
    await super.initialize(config);
    // Add AStar-specific statistics
    this.stats.pathsFound = 0;
    this.stats.pathsFailed = 0;
    this.stats.totalSearchSteps = 0;
    this.stats.averagePathLength = 0;
    this.stats.averageSearchTime = 0;
  }

  /**
   * Register a heuristic function for A* pathfinding
   * @param {string} name - Name of the heuristic
   * @param {Function} heuristicFn - Function that takes (fromNode, toNode, context) and returns estimated cost
   */
  registerHeuristic(name, heuristicFn) {
    this.heuristics.set(name, heuristicFn);
  }

  /**
   * Find the optimal path from start to goal using A* algorithm
   * @param {string|Object} start - Start node or state
   * @param {string|Object} goal - Goal node or state
   * @param {Object} options - Pathfinding options
   * @returns {Object|null} Path object with path array and metadata, or null if no path found
   */
  async findPath(start, goal, options = {}) {
    const startTime = Date.now();
    const {
      heuristic = 'default',
      weight = 1.0,
      allowDiagonal = true,
      getNeighbors = null, // Custom function to get neighbors
      getCost = null,      // Custom function to get edge cost
      context = {}         // Additional context for heuristics
    } = options;

    // Convert nodes to string keys if they are objects
    const startKey = typeof start === 'object' ? JSON.stringify(start) : start;
    const goalKey = typeof goal === 'object' ? JSON.stringify(goal) : goal;

    // Use custom neighbor function or default to adjacencyBag
    const getNeighborsFn = getNeighbors || this._getDefaultNeighbors.bind(this);
    
    // Use custom cost function or default
    const getCostFn = getCost || this._getDefaultCost.bind(this);

    // Initialize open and closed sets
    const openSet = new PriorityQueue();
    const closedSet = new Set();
    const cameFrom = new Map();
    
    // G score: cost from start to node
    const gScore = new Map();
    // F score: estimated total cost from start to goal through node
    const fScore = new Map();

    // Initialize start node
    gScore.set(startKey, 0);
    
    const startHeuristic = this._getHeuristic(heuristic, startKey, goalKey, context);
    fScore.set(startKey, startHeuristic * weight);
    
    openSet.push(startKey, fScore.get(startKey));

    let steps = 0;

    while (!openSet.isEmpty()) {
      if (Date.now() - startTime > this.timeout) {
        this._updateStatsOnPlanExecution(false);
        this.stats.pathsFailed++;
        return null; // Timeout
      }

      if (steps > this.maxSteps) {
        this._updateStatsOnPlanExecution(false);
        this.stats.pathsFailed++;
        return null; // Too many steps
      }

      steps++;
      
      // Get node with lowest fScore
      const currentKey = openSet.pop();
      
      if (currentKey === goalKey) {
        // Reconstruct path
        const path = this._reconstructPath(cameFrom, currentKey);
        const endTime = Date.now();
        
        this._updateStatsOnPlanGeneration(path.length, endTime - startTime);
        this.stats.pathsFound++;
        this.stats.averageSearchTime = 
          ((this.stats.averageSearchTime * (this.stats.pathsFound - 1)) + (endTime - startTime)) / this.stats.pathsFound;
        this.stats.averagePathLength = 
          ((this.stats.averagePathLength * (this.stats.pathsFound - 1)) + path.length) / this.stats.pathsFound;
        this.stats.totalSearchSteps += steps;
        
        return {
          path,
          cost: gScore.get(currentKey),
          steps,
          time: endTime - startTime,
          found: true
        };
      }

      closedSet.add(currentKey);

      // Get neighbors
      const neighbors = await getNeighborsFn(currentKey, context);
      
      for (const neighbor of neighbors) {
        const neighborKey = typeof neighbor.node === 'object' ? JSON.stringify(neighbor.node) : neighbor.node;
        const neighborPriority = neighbor.priority || 0.5; // Use priority as a factor for cost
        
        if (closedSet.has(neighborKey)) {
          continue;
        }

        // Calculate tentative gScore
        const cost = getCostFn(currentKey, neighborKey, context);
        const tentativeGScore = gScore.get(currentKey) + cost;
        
        if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
          // This path to neighbor is better than any previous one
          cameFrom.set(neighborKey, currentKey);
          gScore.set(neighborKey, tentativeGScore);
          
          const heuristicValue = this._getHeuristic(heuristic, neighborKey, goalKey, context);
          fScore.set(neighborKey, tentativeGScore + (heuristicValue * weight));
          
          if (!openSet.contains(neighborKey)) {
            openSet.push(neighborKey, fScore.get(neighborKey));
          }
        }
      }
    }

    this._updateStatsOnPlanExecution(false);
    this.stats.pathsFailed++;
    return null; // No path found
  }

  /**
   * Find multiple paths for different goals or with different strategies
   * @param {Array} startEndPairs - Array of {start, goal} pairs
   * @param {Object} options - Pathfinding options
   * @returns {Array} Array of path results
   */
  async findMultiplePaths(startEndPairs, options = {}) {
    const results = [];
    
    for (const pair of startEndPairs) {
      const result = await this.findPath(pair.start, pair.goal, options);
      results.push({
        start: pair.start,
        goal: pair.goal,
        result
      });
    }
    
    return results;
  }

  /**
   * Get the best path among multiple possible paths
   * @param {Array} startEndPairs - Array of {start, goal} pairs
   * @param {Object} options - Pathfinding options
   * @returns {Object} Best path result
   */
  async findBestPath(startEndPairs, options = {}) {
    const paths = await this.findMultiplePaths(startEndPairs, options);
    
    // Find the path with the lowest cost
    let bestPath = null;
    let bestCost = Infinity;
    
    for (const pathResult of paths) {
      if (pathResult.result && pathResult.result.cost < bestCost) {
        bestCost = pathResult.result.cost;
        bestPath = pathResult;
      }
    }
    
    return bestPath;
  }

  /**
   * Get neighbors for a node using adjacencyBag
   * @private
   */
  _getDefaultNeighbors(nodeKey, context = {}) {
    if (!this.adjacencyBag) {
      return []; // If no adjacency bag, return empty (use custom neighbor function)
    }
    
    const neighbors = this.adjacencyBag.getNeighbors(nodeKey, 100, 0.0); // Get all neighbors
    return neighbors.map(n => ({
      node: n.node,
      priority: n.priority,
      metadata: n.metadata
    }));
  }

  /**
   * Get default edge cost based on relationship priority (inverse relationship)
   * @private
   */
  _getDefaultCost(fromNode, toNode, context = {}) {
    if (!this.adjacencyBag) {
      return 1.0; // Default cost if no adjacency bag
    }
    
    const priority = this.adjacencyBag.getRelationshipPriority(fromNode, toNode);
    // Higher priority means lower cost (more desirable path)
    return priority ? (1.0 / priority) : 1.0;
  }

  /**
   * Get heuristic value using registered heuristic functions
   * @private
   */
  _getHeuristic(heuristicName, fromNode, toNode, context = {}) {
    const heuristicFn = this.heuristics.get(heuristicName) || this.heuristics.get('default');
    
    if (!heuristicFn) {
      return 0; // Default to 0 if no heuristic available
    }
    
    try {
      return heuristicFn(fromNode, toNode, context);
    } catch (error) {
      Logger.warn(`Heuristic ${heuristicName} failed, using 0:`, error);
      return 0;
    }
  }

  /**
   * Register default heuristics
   * @private
   */
  _registerDefaultHeuristics() {
    // Default heuristic - for simple cases
    this.registerHeuristic('default', (fromNode, toNode, context) => {
      // If nodes are strings representing coordinates in format "x,y" or objects with x,y properties
      if (typeof fromNode === 'string' && typeof toNode === 'string') {
        const fromParts = fromNode.split(',');
        const toParts = toNode.split(',');
        
        if (fromParts.length >= 2 && toParts.length >= 2) {
          // Assume format is "x,y" and calculate Euclidean distance
          const x1 = parseFloat(fromParts[0]);
          const y1 = parseFloat(fromParts[1]);
          const x2 = parseFloat(toParts[0]);
          const y2 = parseFloat(toParts[1]);
          
          if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
            return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
          }
        }
      }
      
      // For non-coordinate nodes, return 0 (Dijkstra's algorithm effectively)
      return 0;
    });
    
    // Manhattan distance heuristic
    this.registerHeuristic('manhattan', (fromNode, toNode, context) => {
      if (typeof fromNode === 'string' && typeof toNode === 'string') {
        const fromParts = fromNode.split(',');
        const toParts = toNode.split(',');
        
        if (fromParts.length >= 2 && toParts.length >= 2) {
          const x1 = parseFloat(fromParts[0]);
          const y1 = parseFloat(fromParts[1]);
          const x2 = parseFloat(toParts[0]);
          const y2 = parseFloat(toParts[1]);
          
          if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
            return Math.abs(x2 - x1) + Math.abs(y2 - y1);
          }
        }
      }
      
      return 0;
    });
    
    // Chebyshev distance heuristic (for 8-directional movement)
    this.registerHeuristic('chebyshev', (fromNode, toNode, context) => {
      if (typeof fromNode === 'string' && typeof toNode === 'string') {
        const fromParts = fromNode.split(',');
        const toParts = toNode.split(',');
        
        if (fromParts.length >= 2 && toParts.length >= 2) {
          const x1 = parseFloat(fromParts[0]);
          const y1 = parseFloat(fromParts[1]);
          const x2 = parseFloat(toParts[0]);
          const y2 = parseFloat(toParts[1]);
          
          if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
            return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
          }
        }
      }
      
      return 0;
    });
  }

  /**
   * Reconstruct path from cameFrom map
   * @private
   */
  _reconstructPath(cameFrom, currentKey) {
    const totalPath = [currentKey];
    
    while (cameFrom.has(currentKey)) {
      currentKey = cameFrom.get(currentKey);
      totalPath.unshift(currentKey);
    }
    
    // If keys are JSON strings, convert them back to objects
    return totalPath.map(key => {
      try {
        return JSON.parse(key);
      } catch {
        return key; // If not JSON, return as is
      }
    });
  }

  /**
   * Get planning statistics
   */
  getStats() {
    return {
      ...this.stats,
      heuristicCount: this.heuristics.size,
      hasAdjacencyBag: !!this.adjacencyBag
    };
  }
}

/**
 * Simple Priority Queue implementation for A* algorithm
 */
class PriorityQueue {
  constructor() {
    this.elements = [];
  }

  push(item, priority) {
    this.elements.push({ item, priority });
    // Sort by priority (lowest first for A*)
    this.elements.sort((a, b) => a.priority - b.priority);
  }

  pop() {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.elements.shift().item;
  }

  contains(item) {
    return this.elements.some(el => el.item === item);
  }

  isEmpty() {
    return this.elements.length === 0;
  }

  size() {
    return this.elements.length;
  }
}

export default AStarPlanner;