#!/usr/bin/env node

/**
 * @file: examples/cognitive-cycle.js
 * @description: Comprehensive example showing Rules and Memory working together in a cognitive cycle
 */

import createCore from '../core/createCore.js';

async function demonstrateCognitiveCycle() {
  console.log('🌀 SeNARS v2 - Cognitive Cycle Demo\n');

  const core = await createCore();

  try {
    // 1. Set up the cognitive environment
    console.log('🏗️  Setting up cognitive environment...');

    // Create focus sets for different cognitive processes
    core.memory.createFocusSet('perception-buffer', 10);
    core.memory.createFocusSet('working-memory', 8);
    core.memory.createFocusSet('reasoning-focus', 5);
    core.memory.createFocusSet('learning-storage', 20);

    core.memory.setFocus('perception-buffer');

    // 2. Create cognitive rules for processing
    console.log('🧠 Creating cognitive processing rules...');

    const cognitiveRules = [
      {
        name: 'perception-filter',
        type: 'perception',
        complexity: 'simple',
        preFilterTags: ['input', 'observation'],
        condition: (ctx) => ctx.inputType === 'observation' && ctx.confidence > 0.7,
        action: (ctx) => {
          // Store in perception buffer
          core.memory.set(`obs-${Date.now()}`, ctx.observation, {
            type: 'observation',
            tags: ['perceived', 'filtered'],
            priority: Math.floor(ctx.confidence * 10)
          });

          return { result: 'perceived', stored: true };
        },
        priority: 9
      },
      {
        name: 'pattern-recognition',
        type: 'reasoning',
        complexity: 'complex',
        preFilterTags: ['pattern', 'analysis'],
        condition: (ctx) => ctx.dataType === 'pattern' && ctx.size > 50,
        action: (ctx) => {
          // Analyze pattern and generate insights
          const insights = {
            pattern: ctx.pattern,
            confidence: ctx.confidence,
            implications: ['trend-detected', 'action-required'],
            generatedAt: new Date().toISOString()
          };

          core.memory.set(`insight-${Date.now()}`, insights, {
            type: 'insight',
            tags: ['pattern', 'analysis', 'generated'],
            priority: 8
          });

          return { result: 'pattern-analyzed', insights };
        },
        priority: 8
      },
      {
        name: 'decision-making',
        type: 'decision',
        complexity: 'medium',
        preFilterTags: ['decision', 'action'],
        condition: (ctx) => ctx.requiresAction && ctx.urgency > 7,
        action: (ctx) => {
          // Make decision and create action plan
          const decision = {
            action: ctx.recommendedAction,
            reasoning: ctx.reasoning,
            confidence: ctx.confidence,
            timestamp: new Date().toISOString()
          };

          core.memory.set(`decision-${Date.now()}`, decision, {
            type: 'decision',
            tags: ['action', 'decision', 'executed'],
            priority: 10
          });

          return { result: 'decision-made', decision };
        },
        priority: 10
      },
      {
        name: 'learning-storage',
        type: 'learning',
        complexity: 'simple',
        preFilterTags: ['experience', 'outcome'],
        condition: (ctx) => ctx.experience && ctx.outcome,
        action: (ctx) => {
          // Store experience for future learning
          const learning = {
            experience: ctx.experience,
            outcome: ctx.outcome,
            learnedAt: new Date().toISOString(),
            usefulness: ctx.usefulness || 0.5
          };

          core.memory.set(`learning-${Date.now()}`, learning, {
            type: 'learning',
            tags: ['experience', 'knowledge', 'stored'],
            priority: Math.floor((ctx.usefulness || 0.5) * 8)
          });

          return { result: 'learned', stored: true };
        },
        priority: 6
      }
    ];

    // Add cognitive rules
    cognitiveRules.forEach(rule => core.rules.add(rule));

    // 3. Simulate cognitive cycle
    console.log('\n🔄 Running cognitive cycle simulation...');

    // Phase 1: Perception
    console.log('\n👁️  Phase 1: Perception');
    const observations = [
      {
        inputType: 'observation',
        confidence: 0.9,
        observation: { sensor: 'temperature', value: 85, unit: 'celsius', location: 'server-room' }
      },
      {
        inputType: 'observation',
        confidence: 0.6,
        observation: { sensor: 'humidity', value: 45, unit: 'percent', location: 'server-room' }
      }
    ];

    for (const obs of observations) {
      const result = await core.rules.evaluate(obs);
      if (result) {
        console.log(`   ✅ Perceived: ${obs.observation.sensor} = ${obs.observation.value}${obs.observation.unit}`);
      }
    }

    // Phase 2: Pattern Recognition
    console.log('\n🔍 Phase 2: Pattern Recognition');
    const patternData = {
      dataType: 'pattern',
      size: 120,
      pattern: { type: 'temperature-trend', direction: 'increasing', rate: 2.5 },
      confidence: 0.85
    };

    const patternResult = await core.rules.evaluate(patternData);
    if (patternResult) {
      console.log(`   ✅ Pattern analyzed: ${patternResult.insights.pattern.type}`);
    }

    // Phase 3: Decision Making
    console.log('\n⚖️  Phase 3: Decision Making');
    const decisionContext = {
      requiresAction: true,
      urgency: 9,
      recommendedAction: 'activate-cooling-system',
      reasoning: 'Temperature trend indicates overheating risk',
      confidence: 0.9
    };

    const decisionResult = await core.rules.evaluate(decisionContext);
    if (decisionResult) {
      console.log(`   ✅ Decision made: ${decisionResult.decision.action}`);
    }

    // Phase 4: Learning
    console.log('\n📚 Phase 4: Learning');
    const learningExperience = {
      experience: 'temperature-monitoring',
      outcome: 'cooling-activated',
      usefulness: 0.9
    };

    const learningResult = await core.rules.evaluate(learningExperience);
    if (learningResult) {
      console.log(`   ✅ Learning stored: ${learningResult.result}`);
    }

    // 4. Demonstrate memory integration
    console.log('\n💭 Memory integration across cognitive cycle...');

    // Show items stored in different focus areas
    core.memory.setFocus('working-memory');
    const workingMemoryItems = core.memory.getFocusItems(5);
    console.log(`\nWorking memory contains ${workingMemoryItems.length} items`);

    // Query for insights generated
    const insights = core.memory.query({
      type: 'insight',
      limit: 5
    });
    console.log(`\nGenerated ${insights.length} insights during cycle`);

    // Query for decisions made
    const decisions = core.memory.query({
      type: 'decision',
      limit: 5
    });
    console.log(`Made ${decisions.length} decisions during cycle`);

    // 5. Show attention dynamics
    console.log('\n🧘 Attention dynamics during cognitive cycle...');

    // Update attention based on cognitive activity
    core.memory.updateFocusAttention('perception-buffer', 0.3);
    core.memory.updateFocusAttention('working-memory', 0.8);
    core.memory.updateFocusAttention('reasoning-focus', 0.7);
    core.memory.updateFocusAttention('learning-storage', 0.5);

    const attentionStats = core.memory.getFocusSetStats();
    console.log('Final attention distribution:');
    Object.entries(attentionStats).forEach(([name, stats]) => {
      const attentionPercent = (stats.attentionScore * 100).toFixed(1);
      console.log(`   ${name}: ${attentionPercent}%`);
    });

    // 6. Performance summary
    console.log('\n📊 Cognitive cycle performance summary...');

    const ruleStats = core.rules.getStats();
    const memoryStats = core.memory.getStats();

    console.log(`   Rules processed: ${ruleStats.totalRules}`);
    console.log(`   Memory items stored: ${memoryStats.storageSize}`);
    console.log(`   Focus sets active: ${Object.keys(attentionStats).length}`);
    console.log(`   Cognitive operations: ${workingMemoryItems.length + insights.length + decisions.length}`);

  } finally {
    await core.stop();
    await core.destroy();
  }
}

// Run the demonstration
demonstrateCognitiveCycle().catch(console.error);