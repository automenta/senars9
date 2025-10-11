import System from '../../core/system/System.js';

describe('PlanProcessor Integration', () => {
  test('system starts successfully with PlanProcessor component', async () => {
    const system = new System({});
    await system.start();

    // Verify PlanProcessor is available
    expect(system.core.planProcessor).toBeDefined();

    // Verify other planning components
    expect(system.core.htnPlanner).toBeDefined();
    expect(system.core.aStarPlanner).toBeDefined();
    expect(system.core.adjacencyBag).toBeDefined();
    expect(system.core.graphTraversal).toBeDefined();

    // Verify PlanProcessor has proper references
    expect(system.core.planProcessor.lm).toBeDefined();
    expect(system.core.planProcessor.htnPlanner).toBeDefined();

    await system.stop();
  });

  test('PlanProcessor can process simple text', async () => {
    const system = new System({});
    await system.start();

    const processor = system.core.planProcessor;
    const testDoc = "Implement user authentication with high priority";

    // Process document (this may return 0 goals due to pattern matching)
    const result = await processor.processDocument(testDoc, 'text');

    // Verify it returns proper structure
    expect(result).toHaveProperty('goals');
    expect(result).toHaveProperty('dependencies');
    expect(result).toHaveProperty('metadata');

    await system.stop();
  });
});