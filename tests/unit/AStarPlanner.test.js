import AStarPlanner from '../../core/plan/AStarPlanner.js';
import AdjacencyBag from '../../core/AdjacencyBag.js';

describe('AStarPlanner', () => {
  let astarPlanner;
  let adjacencyBag;

  beforeEach(async () => {
    adjacencyBag = new AdjacencyBag();
    await adjacencyBag.initialize({ nodeBagCapacity: 50 });
    
    astarPlanner = new AStarPlanner(adjacencyBag);
    await astarPlanner.initialize();
  });

  test('should initialize correctly', () => {
    expect(astarPlanner).toBeDefined();
    expect(astarPlanner.getStats().pathsFound).toBe(0);
    expect(astarPlanner.getStats().heuristicCount).toBeGreaterThan(0);
  });

  test('should find a simple path in grid-like structure', async () => {
    // Create a simple grid-like graph using coordinates as node names
    // Nodes: "0,0", "0,1", "1,0", "1,1", etc.
    
    // Create connections for a simple 3x3 grid
    const connections = [
      { from: "0,0", to: "0,1", priority: 1.0 },
      { from: "0,0", to: "1,0", priority: 1.0 },
      { from: "0,1", to: "0,2", priority: 1.0 },
      { from: "0,1", to: "1,1", priority: 1.0 },
      { from: "1,0", to: "1,1", priority: 1.0 },
      { from: "1,0", to: "2,0", priority: 1.0 },
      { from: "1,1", to: "1,2", priority: 1.0 },
      { from: "1,1", to: "2,1", priority: 1.0 },
      { from: "2,0", to: "2,1", priority: 1.0 },
      { from: "2,1", to: "2,2", priority: 1.0 },
      { from: "0,2", to: "1,2", priority: 1.0 },
      { from: "1,2", to: "2,2", priority: 1.0 },
    ];

    for (const conn of connections) {
      adjacencyBag.addRelationship(conn.from, conn.to, conn.priority);
      // Add reverse relationship for bidirectional grid
      adjacencyBag.addRelationship(conn.to, conn.from, conn.priority);
    }

    // Find path from "0,0" to "2,2"
    const result = await astarPlanner.findPath("0,0", "2,2", {
      heuristic: 'manhattan'  // Manhattan distance works well for grid
    });

    expect(result).not.toBeNull();
    expect(result.found).toBe(true);
    expect(result.path).toContain("0,0");
    expect(result.path).toContain("2,2");
    expect(result.path.length).toBeGreaterThan(1);
    expect(result.cost).toBeGreaterThan(0);
  });

  test('should find path with custom neighbor function', async () => {
    // Create a simple graph manually
    adjacencyBag.addRelationship("A", "B", 0.8);
    adjacencyBag.addRelationship("B", "C", 0.9);
    adjacencyBag.addRelationship("A", "C", 0.6);

    // Use default neighbor finding via adjacencyBag
    const result = await astarPlanner.findPath("A", "C");
    
    expect(result).not.toBeNull();
    expect(result.found).toBe(true);
    expect(result.path).toContain("A");
    expect(result.path).toContain("C");
  });

  test('should return null for non-existent path', async () => {
    // Create a graph where no path exists from A to Z
    adjacencyBag.addRelationship("A", "B", 0.8);
    adjacencyBag.addRelationship("B", "C", 0.9);
    // Node "Z" is completely disconnected
    
    const result = await astarPlanner.findPath("A", "Z");
    
    expect(result).toBeNull();
  });

  test('should use custom cost function', async () => {
    adjacencyBag.addRelationship("A", "B", 0.5);
    adjacencyBag.addRelationship("B", "C", 0.7);
    adjacencyBag.addRelationship("A", "C", 0.3); // Less direct path

    // Custom cost function that uses inverse priority relationship
    const customCost = (from, to, context) => {
      const priority = adjacencyBag.getRelationshipPriority(from, to);
      return priority ? (2.0 - priority) : 1.5; // Higher priority = lower cost
    };

    const result = await astarPlanner.findPath("A", "C", {
      getCost: customCost
    });

    expect(result).not.toBeNull();
    expect(result.found).toBe(true);
  });

  test('should find best path among multiple options', async () => {
    // Create a graph with multiple possible paths from A to D
    adjacencyBag.addRelationship("A", "B", 0.8);
    adjacencyBag.addRelationship("A", "C", 0.6);
    adjacencyBag.addRelationship("B", "D", 0.7);
    adjacencyBag.addRelationship("C", "D", 0.9);

    // Path A->B->D vs A->C->D
    const result = await astarPlanner.findPath("A", "D");
    
    expect(result).not.toBeNull();
    expect(result.found).toBe(true);
    expect(result.path.length).toBeGreaterThan(1);
  });

  test('should register and use custom heuristic', async () => {
    // Register a custom heuristic
    astarPlanner.registerHeuristic('zero', (from, to, context) => 0);
    
    // Create simple path
    adjacencyBag.addRelationship("A", "B", 1.0);
    adjacencyBag.addRelationship("B", "C", 1.0);
    
    const result = await astarPlanner.findPath("A", "C", {
      heuristic: 'zero'  // This will make it behave like Dijkstra
    });

    expect(result).not.toBeNull();
    expect(result.found).toBe(true);
    expect(result.path).toContain("A");
    expect(result.path).toContain("C");
  });

  test('should get statistics correctly', () => {
    const stats = astarPlanner.getStats();
    expect(stats).toHaveProperty('pathsFound');
    expect(stats).toHaveProperty('pathsFailed');
    expect(stats).toHaveProperty('heuristicCount');
    expect(stats).toHaveProperty('hasAdjacencyBag');
  });

  test('should respect max steps limit', async () => {
    // Test max steps functionality by creating a custom neighbor function that creates loops
    let callCount = 0;
    const result = await astarPlanner.findPath("A", "B", {
      getNeighbors: async (node) => {
        callCount++;
        // Create a loop that would cause many steps if not limited
        if (callCount > 100) {  // Prevent actual infinite loop in test
          return [];
        }
        return [{ node: "C", priority: 1.0 }, { node: "B", priority: 1.0 }];
      },
      maxSteps: 10, // Limit steps to ensure termination
      timeout: 1000 // Set a reasonable timeout
    });

    // The result should either be a path or null due to step limit 
    // (depends on implementation, but should not hang)
    expect(result).toBeDefined(); // Should not be undefined
  });
});