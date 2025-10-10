/**
 * @file: examples/shared/patternDetectorDemo.js
 * @description: Shared functionality for pattern detection demonstration used by both tests and examples
 */

import System from '../../core/system/System.js';

// Export the main functionality for both tests and examples to use
export async function demonstratePatternDetection() {
  // Create and start the system
  const system = new System({
    version: '2.0.0'
  });

  try {
    await system.start();
    console.log('✅ System started successfully');

    // Access the pattern detector component
    const patternDetector = system.core.patternDetector;
    if (!patternDetector) {
      console.log('⚠️  PatternDetector not available in this configuration');
      return null;
    }

    console.log('\\n📋 Pattern Detector Initial Stats:');
    const initialStats = patternDetector.getStats();
    console.log('   Temporal Patterns:', initialStats.temporalPatterns);
    console.log('   Causal Patterns:', initialStats.causalPatterns);
    console.log('   Hierarchical Patterns:', initialStats.hierarchicalPatterns);

    // 1. Create sample event data for pattern detection
    console.log('\\n🔍 Creating sample event data for pattern detection...');
    const sampleEvents = [
      { id: 'event-1', type: 'temperature', value: 20, timestamp: Date.now() - 5000, context: 'server-room' },
      { id: 'event-2', type: 'temperature', value: 21, timestamp: Date.now() - 4000, context: 'server-room' },
      { id: 'event-3', type: 'temperature', value: 22, timestamp: Date.now() - 3000, context: 'server-room' },
      { id: 'event-4', type: 'fan-speed', value: 60, timestamp: Date.now() - 2000, context: 'server-room' },
      { id: 'event-5', type: 'temperature', value: 23, timestamp: Date.now() - 1000, context: 'server-room' },
      { id: 'event-6', type: 'fan-speed', value: 65, timestamp: Date.now(), context: 'server-room' },
      { id: 'event-7', type: 'temperature', value: 21, timestamp: Date.now() + 1000, context: 'server-room' },
      { id: 'event-8', type: 'temperature', value: 20, timestamp: Date.now() + 2000, context: 'server-room' },
      { id: 'event-9', type: 'cpu-usage', value: 75, timestamp: Date.now() + 3000, context: 'server' },
      { id: 'event-10', type: 'cpu-usage', value: 85, timestamp: Date.now() + 4000, context: 'server' }
    ];

    // 2. Process event stream to detect patterns
    console.log('\\n🧠 Processing event stream for pattern detection...');
    const detectionResult = await patternDetector.processEventStream(sampleEvents, 'temperature-monitoring');

    console.log('\\n📊 Pattern Detection Results:');
    console.log('   Temporal Patterns Found:', detectionResult.temporal.length);
    console.log('   Causal Patterns Found:', detectionResult.causal.length);
    console.log('   Hierarchical Patterns Found:', detectionResult.hierarchical.length);

    // 3. Display detected patterns
    if (detectionResult.temporal.length > 0) {
      console.log('\\n📈 Temporal Patterns:');
      detectionResult.temporal.forEach((pattern, index) => {
        console.log(`   ${index + 1}. ${pattern.type}: ${pattern.length} events, confidence: ${pattern.confidence.toFixed(2)}`);
      });
    }

    if (detectionResult.causal.length > 0) {
      console.log('\\n🔗 Causal Patterns:');
      detectionResult.causal.forEach((pattern, index) => {
        console.log(`   ${index + 1}. Causal strength: ${pattern.strength.toFixed(2)}, confidence: ${pattern.confidence.toFixed(2)}`);
      });
    }

    if (detectionResult.hierarchical.length > 0) {
      console.log('\\n🏗️ Hierarchical Patterns:');
      detectionResult.hierarchical.forEach((pattern, index) => {
        console.log(`   ${index + 1}. Depth: ${pattern.depth}, confidence: ${pattern.confidence.toFixed(2)}`);
      });
    }

    // 4. Demonstrate pattern matching
    console.log('\\n🎯 Testing pattern matching...');
    if (detectionResult.temporal.length > 0) {
      const samplePattern = detectionResult.temporal[0];
      const matches = await patternDetector.matchPattern('temporal', sampleEvents, samplePattern);
      console.log('   Matches found for temporal pattern:', matches.length);
    }

    // 5. Demonstrate prediction based on detected patterns
    console.log('\\n🔮 Testing prediction capabilities...');
    const predictions = await patternDetector.predictNextEvents(sampleEvents);
    console.log('   Predicted next events:', predictions.length);

    // 6. Show updated stats
    console.log('\\n📈 Updated Pattern Detection Stats:');
    const finalStats = patternDetector.getStats();
    console.log('   Total Patterns Detected:', finalStats.totalPatterns);
    console.log('   Pattern Matches:', finalStats.patternMatches);
    console.log('   Learning Updates:', finalStats.learningUpdates);

    // Return results for verification
    return {
      initialStats,
      finalStats,
      detectionResult,
      predictions,
      hasPatternDetector: !!patternDetector,
      system
    };

  } catch (error) {
    console.error('❌ Error during pattern detection example execution:', error);
    throw error;
  } finally {
    if (system) {
      await system.stop();
      console.log('\\n✅ System stopped');
    }
  }
}

// Export a function specifically for testing pattern detection functionality
export async function testPatternDetectionFunctionality() {
  const system = new System({
    version: '2.0.0'
  });

  try {
    await system.start();
    
    const patternDetector = system.core.patternDetector;
    if (!patternDetector) {
      throw new Error('PatternDetector not available');
    }

    // Test pattern detection components exist
    const componentsAvailable = {
      hasPatternDetector: !!patternDetector,
      hasProcessEventStream: typeof patternDetector.processEventStream === 'function',
      hasMatchPattern: typeof patternDetector.matchPattern === 'function',
      hasPredictNextEvents: typeof patternDetector.predictNextEvents === 'function',
      hasGetPatterns: typeof patternDetector.getPatterns === 'function',
      hasGetStats: typeof patternDetector.getStats === 'function',
      hasLearnFromPatterns: typeof patternDetector.learnFromPatterns === 'function'
    };

    // Create simple test events
    const testEvents = [
      { type: 'test', name: 'A', timestamp: Date.now() - 1000 },
      { type: 'test', name: 'B', timestamp: Date.now() - 500 },
      { type: 'test', name: 'A', timestamp: Date.now() },
      { type: 'test', name: 'B', timestamp: Date.now() + 500 }
    ];

    // Test event stream processing
    const result = await patternDetector.processEventStream(testEvents, 'test-stream');

    // Test pattern retrieval
    const temporalPatterns = patternDetector.getPatterns('temporal');
    const causalPatterns = patternDetector.getPatterns('causal');
    const hierarchicalPatterns = patternDetector.getPatterns('hierarchical');

    // Test prediction
    const predictions = await patternDetector.predictNextEvents(testEvents);

    // Get stats
    const stats = patternDetector.getStats();

    return {
      componentsAvailable,
      result,
      temporalPatterns,
      causalPatterns,
      hierarchicalPatterns,
      predictions,
      stats
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing temporal pattern recognition with prediction
export async function testTemporalPatternRecognition() {
  const system = new System({
    version: '2.0.0'
  });

  try {
    await system.start();
    
    const patternDetector = system.core.patternDetector;
    if (!patternDetector) {
      throw new Error('PatternDetector not available');
    }

    // Create events with temporal patterns
    const now = Date.now();
    const temporalEvents = [
      { type: 'temperature', value: 20, timestamp: now - 60000, context: 'server-room' },
      { type: 'temperature', value: 21, timestamp: now - 50000, context: 'server-room' },
      { type: 'temperature', value: 22, timestamp: now - 40000, context: 'server-room' },
      { type: 'temperature', value: 23, timestamp: now - 30000, context: 'server-room' },
      { type: 'temperature', value: 24, timestamp: now - 20000, context: 'server-room' },
      { type: 'temperature', value: 25, timestamp: now - 10000, context: 'server-room' }
    ];

    // Process events to detect temporal patterns
    const temporalResult = await patternDetector.processEventStream(temporalEvents, 'temporal-test');

    // Check if temporal patterns were detected
    const hasTemporalPatterns = temporalResult.temporal.length > 0;

    // Test prediction based on temporal patterns
    const predictions = await patternDetector.predictNextEvents(temporalEvents);

    return {
      temporalResult,
      hasTemporalPatterns,
      predictions,
      predictionCount: predictions.length,
      predictionConfidence: predictions.length > 0 ? predictions[0].confidence || 0 : 0
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing causal relationship identification
export async function testCausalRelationshipIdentification() {
  const system = new System({
    version: '2.0.0'
  });

  try {
    await system.start();
    
    const patternDetector = system.core.patternDetector;
    if (!patternDetector) {
      throw new Error('PatternDetector not available');
    }

    // Create events with potential causal relationships
    const now = Date.now();
    const causalEvents = [
      { type: 'cpu-increase', value: 50, timestamp: now - 10000, context: 'server' },
      { type: 'fan-activation', value: 60, timestamp: now - 9000, context: 'server' },
      { type: 'cpu-increase', value: 70, timestamp: now - 5000, context: 'server' },
      { type: 'fan-activation', value: 75, timestamp: now - 4000, context: 'server' },
      { type: 'cpu-increase', value: 80, timestamp: now - 1000, context: 'server' }
    ];

    // Process events to detect causal patterns
    const causalResult = await patternDetector.processEventStream(causalEvents, 'causal-test');

    // Check if causal patterns were detected
    const hasCausalPatterns = causalResult.causal.length > 0;

    // Test causal pattern matching
    let causalMatchCount = 0;
    if (causalResult.causal.length > 0) {
      const causalPattern = causalResult.causal[0];
      const matches = await patternDetector.matchPattern('causal', causalEvents, causalPattern);
      causalMatchCount = matches.length;
    }

    return {
      causalResult,
      hasCausalPatterns,
      causalMatchCount,
      detectedCausalPatterns: causalResult.causal.length
    };
  } finally {
    await system.stop();
  }
}

// Export function for testing pattern confidence scoring
export async function testPatternConfidenceScoring() {
  const system = new System({
    version: '2.0.0'
  });

  try {
    await system.start();
    
    const patternDetector = system.core.patternDetector;
    if (!patternDetector) {
      throw new Error('PatternDetector not available');
    }

    // Create events with different confidence levels
    const now = Date.now();
    const confidenceEvents = [
      { type: 'regular-pattern', value: 'A', timestamp: now - 5000, context: 'test' },
      { type: 'regular-pattern', value: 'B', timestamp: now - 4000, context: 'test' },
      { type: 'regular-pattern', value: 'A', timestamp: now - 3000, context: 'test' },
      { type: 'regular-pattern', value: 'B', timestamp: now - 2000, context: 'test' },
      { type: 'regular-pattern', value: 'A', timestamp: now - 1000, context: 'test' },
      { type: 'regular-pattern', value: 'B', timestamp: now, context: 'test' }
    ];

    // Process events
    const result = await patternDetector.processEventStream(confidenceEvents, 'confidence-test');

    // Check confidence scores of detected patterns
    const patternConfidences = result.all.map(p => p.confidence);

    return {
      result,
      patternConfidences,
      averageConfidence: patternConfidences.length > 0 
        ? patternConfidences.reduce((a, b) => a + b) / patternConfidences.length 
        : 0,
      highestConfidence: patternConfidences.length > 0 
        ? Math.max(...patternConfidences) 
        : 0
    };
  } finally {
    await system.stop();
  }
}