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
      { id: 'event-1', type: 'temperature', name: 'temp-reading', timestamp: Date.now() - 10, context: 'server-room' },
      { id: 'event-2', type: 'temperature', name: 'temp-reading', timestamp: Date.now() - 9, context: 'server-room' },
      { id: 'event-3', type: 'temperature', name: 'temp-reading', timestamp: Date.now() - 8, context: 'server-room' },
      { id: 'event-4', type: 'fan-control', name: 'fan-reading', timestamp: Date.now() - 7, context: 'server-room' },
      { id: 'event-5', type: 'temperature', name: 'temp-reading', timestamp: Date.now() - 6, context: 'server-room' },
      { id: 'event-6', type: 'fan-control', name: 'fan-reading', timestamp: Date.now() - 5, context: 'server-room' },
      { id: 'event-7', type: 'temperature', name: 'temp-reading', timestamp: Date.now() - 4, context: 'server-room' },
      { id: 'event-8', type: 'temperature', name: 'temp-reading', timestamp: Date.now() - 3, context: 'server-room' },
      { id: 'event-9', type: 'cpu-monitor', name: 'cpu-reading', timestamp: Date.now() - 2, context: 'server' },
      { id: 'event-10', type: 'cpu-monitor', name: 'cpu-reading', timestamp: Date.now() - 1, context: 'server' }
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

    // Create simple test events (with more events for confidence threshold)
    const testEvents = [
      { type: 'test', name: 'A', timestamp: Date.now() - 7 },
      { type: 'test', name: 'B', timestamp: Date.now() - 6 },
      { type: 'test', name: 'A', timestamp: Date.now() - 5 },
      { type: 'test', name: 'B', timestamp: Date.now() - 4 },
      { type: 'test', name: 'A', timestamp: Date.now() - 3 },
      { type: 'test', name: 'B', timestamp: Date.now() - 2 },
      { type: 'test', name: 'A', timestamp: Date.now() - 1 },
      { type: 'test', name: 'B', timestamp: Date.now() }
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

    // Create a stream of events with identical type and name to ensure temporal pattern detection
    // The algorithm requires at least 8 similar events to meet the confidence threshold (events.length/10 >= 0.7)
    const now = Date.now();
    const temporalEvents = [];
    for (let i = 0; i < 10; i++) {
        temporalEvents.push({
            type: 'system-alert',
            name: 'high-cpu',
            timestamp: now - (10 - i) * 1000, // Events spaced 1 second apart
            context: 'server-001'
        });
    }

    // Ensure pattern detector is properly configured for testing
    if (patternDetector.config) {
      patternDetector.config.minPatternFrequency = 2; // Lower threshold for testing
      patternDetector.config.similarityThreshold = 0.5; // Lower threshold for testing
    }

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

    // Create events with potential causal relationships (enough to meet confidence threshold)
    const now = Date.now();
    const causalEvents = [
      { type: 'cpu-event', name: 'cpu-increase', value: 50, timestamp: now - 8, context: 'server' },
      { type: 'fan-event', name: 'fan-activation', value: 60, timestamp: now - 7, context: 'server' },
      { type: 'cpu-event', name: 'cpu-increase', value: 70, timestamp: now - 6, context: 'server' },
      { type: 'fan-event', name: 'fan-activation', value: 75, timestamp: now - 5, context: 'server' },
      { type: 'cpu-event', name: 'cpu-increase', value: 80, timestamp: now - 4, context: 'server' },
      { type: 'fan-event', name: 'fan-activation', value: 85, timestamp: now - 3, context: 'server' },
      { type: 'cpu-event', name: 'cpu-increase', value: 90, timestamp: now - 2, context: 'server' },
      { type: 'fan-event', name: 'fan-activation', value: 95, timestamp: now - 1, context: 'server' }
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

    // Create events with different confidence levels (enough events for confidence threshold)
    const now = Date.now();
    const confidenceEvents = [
      { type: 'regular-pattern', name: 'pattern-a', timestamp: now - 8, context: 'test' },
      { type: 'regular-pattern', name: 'pattern-b', timestamp: now - 7, context: 'test' },
      { type: 'regular-pattern', name: 'pattern-a', timestamp: now - 6, context: 'test' },
      { type: 'regular-pattern', name: 'pattern-b', timestamp: now - 5, context: 'test' },
      { type: 'regular-pattern', name: 'pattern-a', timestamp: now - 4, context: 'test' },
      { type: 'regular-pattern', name: 'pattern-b', timestamp: now - 3, context: 'test' },
      { type: 'regular-pattern', name: 'pattern-a', timestamp: now - 2, context: 'test' },
      { type: 'regular-pattern', name: 'pattern-b', timestamp: now - 1, context: 'test' }
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