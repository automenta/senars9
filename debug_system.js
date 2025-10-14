#!/usr/bin/env node

import System from './core/system/System.js';

async function debugSystem() {
  console.log('🚀 Initializing SeNARS System for Debugging...');
  
  const system = new System({
    components: {
      webSocketServer: {
        enabled: false  // Disable WebSocket server for terminal UI
      }
    }
  });
  
  try {
    await system.start();
    console.log('✅ System initialized successfully');
    
    // Add a simple task
    await system.input({
      term: 'debug_test',
      punctuation: '!',
      truth: { frequency: 0.9, confidence: 0.9 }
    });
    console.log('✅ Task added to system');
    
    // Debug: log the system structure
    console.log('\n🔍 Debugging system structure...');
    console.log('system:', typeof system);
    console.log('system.core:', typeof system.core);
    
    if (system.core) {
      console.log('system.core keys:', Object.keys(system.core));
      
      // Look for all components that might contain tasks
      const componentNames = [
        'memory', 'reasoning', 'rules', 'adjacencyBag', 'planProcessor', 
        'htnPlanner', 'aStarPlanner', 'analysis', 'ingestor', 'reports',
        'patternDetector', 'webSocketServer', 'cycle', 'focus', 'config',
        'messages', 'strategyRegistry', 'systemContext', 'contradictionAnalyzer',
        'resolutionStrategy'
      ];
      
      for (const name of componentNames) {
        const component = system.core[name];
        if (component) {
          console.log(`\\n--- ${name} ---`);
          console.log(`${name}:`, typeof component);
          console.log(`${name} keys:`, Object.keys(component).slice(0, 10)); // First 10 keys
          
          // Look for specific methods that might return tasks
          const taskRelatedMethods = [
            'getAllTasks', 'getTasks', 'queryTasks', 'getTask', 'getBeliefs',
            'getGoals', 'getQuestions', 'getConcepts', 'getTopTasks', 'tasks',
            'getMemoryContents', 'getStoredTasks', 'getActiveTasks'
          ];
          
          for (const method of taskRelatedMethods) {
            if (typeof component[method] === 'function') {
              console.log(`  ${method}: function - trying to call...`);
              try {
                let result;
                if (name === 'focus' && method === 'getFocusItems') {
                  result = component[method](20); // Limit focus items
                } else {
                  result = component[method]();
                }
                
                console.log(`    Result type: ${typeof result}`);
                if (Array.isArray(result)) {
                  console.log(`    Result length: ${result.length}`);
                  if (result.length > 0) {
                    console.log(`    Sample:`, JSON.stringify(result[0]).substring(0, 100) + '...');
                  }
                } else {
                  console.log(`    Result:`, JSON.stringify(result).substring(0, 100) + '...');
                }
              } catch (err) {
                console.log(`    Error calling ${method}:`, err.message);
              }
            }
          }
        } else {
          console.log(`${name}: undefined`);
        }
      }
    }
    
    await system.stop();
    console.log('\\n✅ System stopped');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugSystem().catch(console.error);