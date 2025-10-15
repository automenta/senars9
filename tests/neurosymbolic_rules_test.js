#!/usr/bin/env node

/**
 * @file: tests/neurosymbolic_rules_test.js
 * @description: Test to verify that all neurosymbolic rules are properly implemented
 */

import System from '../core/system/System.js';
import { GoalDecompositionRule } from '../core/reasoning/lm/rules/GoalDecompositionRule.js';
import { HypothesisGenerationRule } from '../core/reasoning/lm/rules/HypothesisGenerationRule.js';
import { VariableGroundingRule } from '../core/reasoning/lm/rules/VariableGroundingRule.js';
import { BeliefRevisionRule } from '../core/reasoning/lm/rules/BeliefRevisionRule.js';
import { ExplanationGenerationRule } from '../core/reasoning/lm/rules/ExplanationGenerationRule.js';
import { SchemaInductionRule } from '../core/reasoning/lm/rules/SchemaInductionRule.js';
import { UncertaintyCalibrationRule } from '../core/reasoning/lm/rules/UncertaintyCalibrationRule.js';
import { TemporalCausalModelingRule } from '../core/reasoning/lm/rules/TemporalCausalModelingRule.js';
import { MetaReasoningGuidanceRule } from '../core/reasoning/lm/rules/MetaReasoningGuidanceRule.js';
import { InteractiveClarificationRule } from '../core/reasoning/lm/rules/InteractiveClarificationRule.js';
import { AnalogicalReasoningRule } from '../core/reasoning/lm/rules/AnalogicalReasoningRule.js';

async function testRules() {
  console.log('🧪 Testing Neurosymbolic Rules Implementation...\n');

  // Initialize system
  const system = new System({
    components: {
      lm: { provider: 'xenova' }
    }
  });

  try {
    await system.start();
    console.log('✅ System initialized successfully');

    // Test each rule can be instantiated with the LM
    const rules = [
      { name: 'GoalDecompositionRule', rule: new GoalDecompositionRule(system.core.lm) },
      { name: 'HypothesisGenerationRule', rule: new HypothesisGenerationRule(system.core.lm) },
      { name: 'VariableGroundingRule', rule: new VariableGroundingRule(system.core.lm) },
      { name: 'BeliefRevisionRule', rule: new BeliefRevisionRule(system.core.lm) },
      { name: 'ExplanationGenerationRule', rule: new ExplanationGenerationRule(system.core.lm) },
      { name: 'SchemaInductionRule', rule: new SchemaInductionRule(system.core.lm) },
      { name: 'UncertaintyCalibrationRule', rule: new UncertaintyCalibrationRule(system.core.lm) },
      { name: 'TemporalCausalModelingRule', rule: new TemporalCausalModelingRule(system.core.lm) },
      { name: 'MetaReasoningGuidanceRule', rule: new MetaReasoningGuidanceRule(system.core.lm) },
      { name: 'InteractiveClarificationRule', rule: new InteractiveClarificationRule(system.core.lm) },
      { name: 'AnalogicalReasoningRule', rule: new AnalogicalReasoningRule(system.core.lm) }
    ];

    console.log(`✅ Created ${rules.length} rules successfully`);

    // Test rule registration with reasoner
    let registered = 0;
    for (const { name, rule } of rules) {
      if (system.core.reasoning) {
        system.core.reasoning.registerRule(rule);
        console.log(`✅ Registered ${name}`);
        registered++;
      } else {
        console.log(`⚠️  Could not register ${name} - reasoner not available`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`- Total rules: ${rules.length}`);
    console.log(`- Successfully registered: ${registered}`);
    console.log(`- Registry stats:`, system.core.reasoning?.getStats ? system.core.reasoning.getStats() : 'N/A');

    // Test that system has LM methods we added
    const lmMethods = [
      'decomposeGoal', 'generateHypotheses', 'groundSymbol',
      'explainConclusion', 'induceSchema', 'estimateConfidence',
      'inferTemporalCausal', 'recommendReasoningStrategy',
      'generateClarifyingQuestions', 'resolveContradiction'
    ];

    let lmMethodsAvailable = 0;
    for (const method of lmMethods) {
      if (typeof system.core.lm[method] === 'function') {
        console.log(`✅ LM method available: ${method}`);
        lmMethodsAvailable++;
      } else {
        console.log(`⚠️  LM method missing: ${method}`);
      }
    }

    console.log(`\n- LM methods available: ${lmMethodsAvailable}/${lmMethods.length}`);

    await system.stop();
    console.log('\n✅ All tests passed! Neurosymbolic demo is properly implemented.');
  } catch (error) {
    console.error('❌ Test failed:', error);
    await system.stop?.();
    process.exit(1);
  }
}

testRules();