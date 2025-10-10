import { jest } from '@jest/globals';
import BootstrapSystem from '../../core/analysis/BootstrapSystem.js';
import LM from '../../core/lm/LM.js';
import PlanProcessor from '../../core/plan/PlanProcessor.js';
import HTNPlanner from '../../core/plan/HTNPlanner.js';

// Mock components for testing
jest.mock('../../core/lm/LM.js');
jest.mock('../../core/plan/PlanProcessor.js');
jest.mock('../../core/plan/HTNPlanner.js');

describe('BootstrapSystem', () => {
  let bootstrapSystem;
  let mockLM;
  let mockPlanProcessor;
  let mockHTNPlanner;
  let mockSystem;

  beforeEach(() => {
    bootstrapSystem = new BootstrapSystem();
    
    mockLM = new LM();
    mockPlanProcessor = new PlanProcessor();
    mockHTNPlanner = new HTNPlanner();
    mockSystem = { input: jest.fn() };
    
    // Mock the methods we'll use
    mockPlanProcessor.processDocument = jest.fn().mockResolvedValue({ goals: [] });
    mockPlanProcessor.convertGoalsToTasks = jest.fn().mockReturnValue([]);
    mockHTNPlanner.plan = jest.fn().mockResolvedValue(null);
    mockHTNPlanner.executePlan = jest.fn().mockResolvedValue({ success: true, reason: null });
    
    bootstrapSystem.setupDependencies(mockLM, mockPlanProcessor, mockHTNPlanner, mockSystem);
  });

  afterEach(async () => {
    if (bootstrapSystem.isBootstrapActive) {
      await bootstrapSystem.stop();
    }
  });

  test('should initialize with correct default values', () => {
    expect(bootstrapSystem.bootstrapPhase).toBe('initial');
    expect(bootstrapSystem.bootstrapGoals).toEqual([]);
    expect(bootstrapSystem.completedGoals).toEqual([]);
    expect(bootstrapSystem.failedGoals).toEqual([]);
    expect(bootstrapSystem.planSources).toEqual([]);
    expect(bootstrapSystem.isBootstrapActive).toBe(false);
    expect(bootstrapSystem.stats.bootstrapIterations).toBe(0);
  });

  test('should setup dependencies correctly', () => {
    expect(bootstrapSystem.lm).toBe(mockLM);
    expect(bootstrapSystem.planProcessor).toBe(mockPlanProcessor);
    expect(bootstrapSystem.htnPlanner).toBe(mockHTNPlanner);
    expect(bootstrapSystem.system).toBe(mockSystem);
  });

  test('should add plan source', () => {
    bootstrapSystem.addPlanSource('./test-plan.md', 'file');
    
    expect(bootstrapSystem.planSources).toHaveLength(1);
    expect(bootstrapSystem.planSources[0].source).toBe('./test-plan.md');
    expect(bootstrapSystem.planSources[0].type).toBe('file');
  });

  test('should start and stop bootstrap process', async () => {
    await bootstrapSystem.start();
    expect(bootstrapSystem.isBootstrapActive).toBe(true);
    
    await bootstrapSystem.stop();
    expect(bootstrapSystem.isBootstrapActive).toBe(false);
  });

  test('should execute single cycle successfully', async () => {
    // Don't start the full bootstrap cycle which runs continuously
    // Instead, just test the executeSingleCycle method directly
    bootstrapSystem.isBootstrapActive = true; // Manually set to active for the single cycle
    bootstrapSystem.bootstrapPhase = 'initial';
    
    const result = await bootstrapSystem.executeSingleCycle();
    expect(result).not.toBeNull();
    expect(bootstrapSystem.stats.bootstrapIterations).toBe(1);
    
    bootstrapSystem.isBootstrapActive = false; // Clean up
  });

  test('should add bootstrap goal directly', () => {
    const goalText = 'test goal';
    const goal = bootstrapSystem.addBootstrapGoal(goalText, 0.9, 0.8);
    
    expect(goal.text).toBe(goalText);
    expect(goal.priority).toBe(0.9);
    expect(goal.confidence).toBe(0.8);
    expect(bootstrapSystem.bootstrapGoals).toHaveLength(1);
  });

  test('should get correct status and stats', () => {
    const status = bootstrapSystem.getStatus();
    expect(status.phase).toBe('initial');
    expect(status.isActive).toBe(false);
    expect(status.goals.total).toBe(0);
    
    const stats = bootstrapSystem.getStats();
    expect(stats.bootstrapIterations).toBe(0);
    expect(stats.totalGoals).toBe(0);
  });

  test('should process plan documents when plan sources are added', async () => {
    const mockGoals = [{ text: 'test goal', priority: 0.8 }];
    mockPlanProcessor.processDocument.mockResolvedValue({ goals: mockGoals });
    
    bootstrapSystem.addPlanSource('./test-plan.md', 'file');
    
    // Simulate the plan reading phase without starting the full system
    await bootstrapSystem._basicPlanReading();
    
    expect(mockPlanProcessor.processDocument).toHaveBeenCalledWith('./test-plan.md', 'file');
    expect(bootstrapSystem.bootstrapGoals).toHaveLength(1);
    expect(bootstrapSystem.bootstrapGoals[0].text).toBe('test goal');
  });

  test('should reset correctly', () => {
    bootstrapSystem.addBootstrapGoal('test goal', 0.8, 0.8);
    bootstrapSystem.completedGoals.push({ goal: 'completed goal' });
    
    bootstrapSystem.reset();
    
    expect(bootstrapSystem.bootstrapGoals).toEqual([]);
    expect(bootstrapSystem.completedGoals).toEqual([]);
    expect(bootstrapSystem.failedGoals).toEqual([]);
    expect(bootstrapSystem.planSources).toEqual([]);
    expect(bootstrapSystem.stats.bootstrapIterations).toBe(0);
  });
});