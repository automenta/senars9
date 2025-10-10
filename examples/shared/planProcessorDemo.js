/**
 * @file: examples/shared/planProcessorDemo.js
 * @description: Shared functionality for plan processing demonstration used by both tests and examples
 */

import System from '../../core/system/System.js';

// Export the main functionality for both tests and examples to use
export async function demonstratePlanProcessing() {
  // Create and start the system
  const system = new System({
    version: '2.0.0'
  });

  try {
    await system.start();
    console.log('✅ System started successfully');

    // Access the plan processor component
    const planProcessor = system.core.planProcessor;
    if (!planProcessor) {
      console.log('⚠️  PlanProcessor not available in this configuration');
      return null;
    }

    console.log('\\n📋 Plan Processor Initial Stats:');
    const initialStats = planProcessor.getStats();
    console.log('   Documents Processed:', initialStats.documentsProcessed);
    console.log('   Goals Extracted:', initialStats.goalsExtracted);
    console.log('   Goals Converted:', initialStats.goalsConverted);

    // 1. Create sample plan document
    console.log('\\n📝 Creating sample plan document...');
    const samplePlan = `# Development Plan

## Goals
- Implement user authentication system
- Design database schema for user management
- Create API endpoints for user operations
- Build user interface for registration and login

## Objectives
- Ensure secure password storage using hashing
- Implement rate limiting for authentication endpoints
- Add two-factor authentication support

## Tasks
- Set up development environment
- Create user model with validation
- Implement login/logout functionality
- Test authentication flow with various scenarios
`;

    // 2. Process the plan document
    console.log('\\n🔄 Processing plan document...');
    const processingResult = await planProcessor.processDocument(samplePlan, 'markdown');

    console.log('\\n📊 Processing Results:');
    console.log('   Goals extracted:', processingResult.goals.length);
    console.log('   Dependencies analyzed:', Object.keys(processingResult.dependencies).length);

    // Display extracted goals
    processingResult.goals.forEach((goal, index) => {
      console.log(`   ${index + 1}. ${goal.text} (Confidence: ${goal.confidence.toFixed(2)}, Priority: ${goal.priority.toFixed(2)})`);
    });

    // Display dependencies
    console.log('\\n🔗 Dependencies:');
    for (const [goal, deps] of Object.entries(processingResult.dependencies)) {
      if (deps.length > 0) {
        console.log(`   ${goal}: depends on ${deps.length} other goals`);
      }
    }

    // 3. Convert goals to tasks
    console.log('\\n📋 Converting goals to tasks...');
    const tasks = planProcessor.convertGoalsToTasks(processingResult.goals);
    console.log('   Tasks generated:', tasks.length);

    // Display generated tasks
    tasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.term} (Priority: ${task.priority.toFixed(2)})`);
    });

    // 4. Test goal prioritization
    console.log('\\n🎯 Testing goal prioritization...');
    const prioritizedGoals = [...processingResult.goals].sort((a, b) => b.priority - a.priority);
    console.log('   Goals sorted by priority');

    // 5. Test goal validation
    console.log('\\n✅ Testing goal validation...');
    const validGoals = processingResult.goals.filter(goal => goal.confidence >= planProcessor.config.confidenceThreshold);
    console.log('   Valid goals after threshold filter:', validGoals.length);

    // 6. Show updated stats
    console.log('\\n📈 Updated Plan Processor Stats:');
    const finalStats = planProcessor.getStats();
    console.log('   Documents Processed:', finalStats.documentsProcessed);
    console.log('   Goals Extracted:', finalStats.goalsExtracted);
    console.log('   Goals Converted:', finalStats.goalsConverted);
    console.log('   LM Processings:', finalStats.lmProcessings);

    // Return results for verification
    return {
      initialStats,
      finalStats,
      processingResult,
      tasks,
      prioritizedGoals,
      validGoals,
      hasPlanProcessor: !!planProcessor,
      system
    };

  } catch (error) {
    console.error('❌ Error during plan processing example execution:', error);
    throw error;
  } finally {
    if (system) {
      await system.stop();
      console.log('\\n✅ System stopped');
    }
  }
}

// Export a function specifically for testing plan processing functionality
export async function testPlanProcessingFunctionality() {
  const system = new System({
    version: '2.0.0'
  });

  try {
    await system.start();
    
    const processor = system.core.planProcessor;
    if (!processor) {
      throw new Error('PlanProcessor not available');
    }

    // Test plan processing components exist
    const componentsAvailable = {
      hasPlanProcessor: !!processor,
      hasProcessDocument: typeof processor.processDocument === 'function',
      hasConvertGoalsToTasks: typeof processor.convertGoalsToTasks === 'function',
      hasGetStats: typeof processor.getStats === 'function',
      hasProcessToTasks: typeof processor.processToTasks === 'function'
    };

    // Create sample plan content
    const samplePlan = `# Sample Plan
## Goals
- Implement feature A
- Test feature A
- Deploy feature A

## Dependencies
- Feature A depends on framework upgrade
- Testing requires test environment
`;

    // Test document processing
    const result = await processor.processDocument(samplePlan, 'markdown');

    // Test converting goals to tasks
    const tasks = processor.convertGoalsToTasks(result.goals);

    // Test processing to tasks directly
    const directResult = await processor.processToTasks(samplePlan);

    // Get stats
    const stats = processor.getStats();

    return {
      componentsAvailable,
      result,
      tasks,
      directResult,
      stats
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing document parsing and goal extraction
export async function testDocumentParsingAndGoalExtraction() {
  const system = new System({
    version: '2.0.0'
  });

  try {
    await system.start();
    
    const processor = system.core.planProcessor;
    if (!processor) {
      throw new Error('PlanProcessor not available');
    }

    // Test different document formats
    const testDocuments = {
      markdown: `# Development Goals
- Implement login functionality
- Design user interface
- Create database schema

## Priorities
- Security features (high priority)
- Performance optimizations (medium priority)
`,

      text: `
GOAL: Create authentication system
OBJECTIVE: Secure user data
TASK: Implement password hashing
NEED TO: Test with multiple scenarios
`,

      json: JSON.stringify({
        goals: [
          "Implement user management",
          "Create reporting system",
          "Add notification service"
        ],
        objectives: [
          "Improve user experience",
          "Increase system reliability"
        ]
      })
    };

    const extractionResults = {};

    // Process markdown
    extractionResults.markdown = await processor.processDocument(testDocuments.markdown, 'markdown');

    // Process text
    extractionResults.text = await processor.processDocument(testDocuments.text, 'text');

    // Process JSON
    extractionResults.json = await processor.processDocument(testDocuments.json, 'json');

    return {
      extractionResults,
      markdownGoals: extractionResults.markdown.goals.length,
      textGoals: extractionResults.text.goals.length,
      jsonGoals: extractionResults.json.goals.length
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing goal prioritization and validation
export async function testGoalPrioritizationAndValidation() {
  const system = new System({
    version: '2.0.0'
  });

  try {
    await system.start();
    
    const processor = system.core.planProcessor;
    if (!processor) {
      throw new Error('PlanProcessor not available');
    }

    // Create plan with goals that have different confidence levels
    const planWithConfidence = `# Project Plan
## High Priority Goals
- Implement core authentication system (confident: 90%)
- Set up database for user management (confident: 85%)

## Medium Priority Goals
- Create user dashboard interface (confident: 70%)
- Implement data export functionality (confident: 60%)

## Lower Priority Goals
- Add advanced analytics (confident: 40%)
- Implement experimental features (confident: 30%)
`;

    // Process the document
    const result = await processor.processDocument(planWithConfidence, 'markdown');

    // Test validation against confidence threshold
    const validGoals = result.goals.filter(goal => goal.confidence >= processor.config.confidenceThreshold);
    const allGoals = result.goals;

    // Test prioritization
    const sortedGoals = [...result.goals].sort((a, b) => b.priority - a.priority);

    return {
      allGoals,
      validGoals,
      sortedGoals,
      confidenceThreshold: processor.config.confidenceThreshold,
      goalsCount: allGoals.length,
      validGoalsCount: validGoals.length
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing task generation from structured plans
export async function testTaskGenerationFromStructuredPlans() {
  const system = new System({
    version: '2.0.0'
  });

  try {
    await system.start();
    
    const processor = system.core.planProcessor;
    if (!processor) {
      throw new Error('PlanProcessor not available');
    }

    // Create a structured plan with dependencies
    const structuredPlan = `# Feature Implementation Plan
## Phase 1: Setup
- Set up development environment
- Configure build system

## Phase 2: Core Implementation
- Implement data models
- Create API layer
- Build business logic

## Phase 3: Testing
- Write unit tests
- Perform integration testing
- Execute end-to-end tests

## Phase 4: Deployment
- Prepare deployment scripts
- Deploy to staging
- Deploy to production

## Dependencies
- Phase 2 depends on Phase 1 completion
- Phase 3 depends on Phase 2 completion
- Phase 4 depends on Phase 3 completion
`;

    // Process the structured plan
    const result = await processor.processDocument(structuredPlan, 'markdown');

    // Convert to tasks
    const tasks = processor.convertGoalsToTasks(result.goals);

    // Verify dependencies were analyzed
    const hasDependencies = Object.keys(result.dependencies).length > 0;

    // Check if tasks were properly generated
    const tasksGenerated = tasks.length > 0;

    // Verify task structure
    const validTasks = tasks.filter(task => 
      task.term && task.type && task.punctuation && task.truth
    );

    return {
      result,
      tasks,
      hasDependencies,
      tasksGenerated,
      validTasks,
      totalGoals: result.goals.length,
      taskCount: tasks.length
    };
  } finally {
    await system.stop();
  }
}