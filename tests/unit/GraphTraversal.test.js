import AdjacencyBag from '../../core/AdjacencyBag.js';
import GraphTraversal from '../../core/GraphTraversal.js';

describe('GraphTraversal', () => {
  let adjacencyBag;
  let graphTraversal;

  beforeEach(async () => {
    adjacencyBag = new AdjacencyBag();
    await adjacencyBag.initialize({ nodeBagCapacity: 20 });
    
    graphTraversal = new GraphTraversal(adjacencyBag);
    await graphTraversal.initialize();
    
    // Create a test graph
    // Path: A -> B -> C -> D
    adjacencyBag.addRelationship('A', 'B', 0.9, { type: 'causal' });
    adjacencyBag.addRelationship('B', 'C', 0.8, { type: 'causal' });
    adjacencyBag.addRelationship('C', 'D', 0.7, { type: 'causal' });
    
    // Star pattern around E
    adjacencyBag.addRelationship('E', 'F', 0.8, { type: 'temporal' });
    adjacencyBag.addRelationship('E', 'G', 0.7, { type: 'temporal' });
    adjacencyBag.addRelationship('E', 'H', 0.9, { type: 'temporal' });
    adjacencyBag.addRelationship('E', 'I', 0.6, { type: 'temporal' });
    
    // Cycle: J -> K -> L -> J
    adjacencyBag.addRelationship('J', 'K', 0.8, { type: 'causal' });
    adjacencyBag.addRelationship('K', 'L', 0.7, { type: 'causal' });
    adjacencyBag.addRelationship('L', 'J', 0.6, { type: 'causal' });
    
    // Cross-connections
    adjacencyBag.addRelationship('D', 'E', 0.5, { type: 'spatial' });
    adjacencyBag.addRelationship('G', 'J', 0.4, { type: 'temporal' });
  });

  test('should initialize correctly', () => {
    expect(graphTraversal).toBeDefined();
    expect(graphTraversal.getStats().traversals).toBe(0);
  });

  test('should perform bidirectional search correctly', () => {
    const path = graphTraversal.bidirectionalSearch('A', 'D');
    expect(path).toEqual(['A', 'B', 'C', 'D']);
  });

  test('should perform priority-based traversal correctly', () => {
    const result = graphTraversal.priorityBasedTraversal('A', 3, 10, 0.4);
    expect(result).toHaveLength(4); // A, B, C, D based on our test graph
    expect(result[0].node).toBe('A');
  });

  test('should perform pattern-based exploration without hanging', () => {
    // Just call the method to ensure it doesn't hang
    const patterns = graphTraversal.patternBasedExploration('E', 3, 0.4);
    expect(patterns).toHaveProperty('chains');
    expect(patterns).toHaveProperty('stars');
    expect(patterns).toHaveProperty('clusters');
    expect(patterns).toHaveProperty('cycles');
  });

  test('should perform semantic pathfinding', () => {
    const result = graphTraversal.semanticPathfinding('A', 'D', {
      allowedRelationshipTypes: ['causal']
    });
    
    expect(result).toBeDefined();
    expect(result.path).toEqual(['A', 'B', 'C', 'D']);
    expect(result.score).toBeGreaterThan(0);
  });

  test('should perform semantic pathfinding with constraints', () => {
    const result = graphTraversal.semanticPathfinding('A', 'D', {
      minPriority: 0.5,
      requiredNodes: ['B']
    });
    
    expect(result).toBeDefined();
    expect(result.path).toContain('B');
    expect(result.path).toEqual(['A', 'B', 'C', 'D']);
  });

  test('should return null for impossible paths', () => {
    const path = graphTraversal.bidirectionalSearch('A', 'Z'); // Z doesn't exist
    expect(path).toBeNull();
    
    const path2 = graphTraversal.bidirectionalSearch('A', 'J'); // No direct path in our simple graph
    expect(path2).toBeNull();
  });

  test('should get correct statistics', () => {
    const stats = graphTraversal.getStats();
    expect(stats).toHaveProperty('traversals');
    expect(stats).toHaveProperty('nodesVisited');
    expect(stats).toHaveProperty('pathsDiscovered');
    expect(stats).toHaveProperty('patternsFound');
  });
});