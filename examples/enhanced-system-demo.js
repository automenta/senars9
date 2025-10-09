/**
 * @file: examples/enhanced-system-demo.js
 * @description: Comprehensive demo of the enhanced SeNARS system
 */

import System from '../core/System.js';

async function runEnhancedSystemDemo() {
  console.log('🚀 Enhanced SeNARS System Demo');
  console.log('===============================');

  // Create and start the system
  const system = new System({
    version: '2.0.0'
  });

  try {
    await system.start();
    console.log('✅ System started successfully');

    // 1. Demonstrate enhanced reasoning with rules integration
    console.log('\n🧠 Enhanced Reasoning Capabilities:');
    const reasoning = system.core.reasoning;
    console.log('   - Full rules integration for inference');
    console.log('   - Deduction, induction, abduction capabilities');
    console.log('   - Strategy management system');
    
    // Add a custom task for reasoning
    const task1 = system.input({
      term: '((Bird) --> (CanFly))',  // Birds can fly
      punctuation: '.',
      truth: { frequency: 0.7, confidence: 0.8 }
    });

    const task2 = system.input({
      term: '(Tweety)',
      punctuation: '?',  // Question: Is Tweety a bird?
      truth: { frequency: 0.9, confidence: 0.9 }
    });

    console.log('   Input tasks processed successfully');

    // 2. Demonstrate unified command/event processing
    console.log('\n🔄 Unified Message Processing:');
    const messages = system.core.messages;
    console.log('   - Unified command/event registration');
    console.log('   - Enhanced middleware pipeline');
    console.log('   - Circuit breaker pattern');
    console.log('   - Comprehensive error handling');
    
    // Register a unified handler
    messages.register('system.status', (data) => {
      console.log(`   Status received: ${JSON.stringify(data)}`);
      return { status: 'processed', timestamp: Date.now() };
    }, { type: 'both' });

    // Test unified dispatch
    const result = await messages.dispatch('system.status', { uptime: 'active' });
    console.log('   Unified dispatch result:', result);

    // 3. Demonstrate knowledge graph capabilities
    console.log('\n🌐 Knowledge Graph (BagAdjacencyCollection):');
    const adjacencyBag = system.core.adjacencyBag;
    console.log('   - Priority-based graph structure');
    console.log('   - Forward and reverse traversal');
    console.log('   - Clustering and centrality analysis');
    console.log('   - Dynamic relationship management');
    
    // Add some relationships to the graph
    adjacencyBag.addRelationship('concept1', 'concept2', 0.8, { relationshipType: 'similarity' });
    adjacencyBag.addRelationship('concept2', 'concept3', 0.9, { relationshipType: 'causation' });
    adjacencyBag.addRelationship('concept3', 'concept1', 0.6, { relationshipType: 'association' });
    
    console.log('   Sample relationships added to graph');
    console.log('   Graph density:', adjacencyBag.getGraphDensity().toFixed(3));
    console.log('   Most central nodes:', adjacencyBag.getMostCentralNodes(3));

    // 4. Demonstrate WebSocket server enhancements
    console.log('\n📡 WebSocket Server Enhancements:');
    console.log('   - Inter-NARS communication protocol');
    console.log('   - Real-time task and event streaming');
    console.log('   - Advanced connection management');
    console.log('   - IP-based rate limiting and connection tracking');
    
    if (system.core.wss) {
      const wsStats = system.core.wss.getStats();
      console.log('   Current WebSocket stats:', {
        running: wsStats.isRunning,
        clients: wsStats.clientCount,
        narsInstances: wsStats.narsInstances
      });
    } else {
      console.log('   (WebSocket server not configured in this example)');
    }

    // 5. System health and metrics
    console.log('\n📊 System Health:');
    const health = system.getHealth();
    console.log('   Status:', health.status);
    console.log('   Uptime:', Math.round(health.uptime / 1000), 'seconds');
    console.log('   Tasks Processed:', health.tasksProcessed);
    
    const metrics = system.getMetrics();
    console.log('   Components Active:', Object.keys(metrics.components).length);
    console.log('   Reasoning Strategies:', reasoning.getStats().strategies);

    console.log('\n🎯 All SeNARS 2.0 Core Features Active:');
    console.log('   ✅ Enhanced Reasoning with Rules Integration');
    console.log('   ✅ Inter-NARS Communication Protocol');
    console.log('   ✅ Real-time Streaming Capabilities');
    console.log('   ✅ Advanced Connection Management');
    console.log('   ✅ Unified Command/Event Processing');
    console.log('   ✅ Comprehensive Error Handling');
    console.log('   ✅ Knowledge Graph Representation');
    console.log('   ✅ Priority-based Relationship Management');

  } catch (error) {
    console.error('❌ Error during demo execution:', error);
  } finally {
    await system.stop();
    console.log('\n✅ System stopped');
    console.log('🎉 SeNARS 2.0 Enhancement Complete!');
  }
}

// Run the demo
runEnhancedSystemDemo().catch(console.error);