#!/usr/bin/env node

/**
 * @file: examples/lm_demo3.js
 * @description: Complete NAR system demo with LM integration and detailed tracing
 * Tests GoalDecompositionRule with natural language goal processing
 */

import { NAR } from '../core/NAR.js';
import { setupLangChainProvider } from '../core/lm/LangChainSetup.js';
import { GoalDecompositionRule } from '../core/reasoning/lm/rules/GoalDecompositionRule.js';
import { Logger } from '../core/base/utilities.js';

const DEMO_GOAL = "Make earth happy!";
const DEMO_TIMEOUT = 10000; // 10 seconds for complete demo

let nar = null;
let decompositionRule = null;

async function runCompleteNARDemo() {
    console.log('🚀 Starting complete NAR system demo with LM integration...');
    console.log(`📥 Natural language goal: "${DEMO_GOAL}"`);
    console.log(`🤖 LM Provider: langchain (llamablit @ http://xyz:11434)`);
    console.log(`⏱️  Demo timeout: ${DEMO_TIMEOUT}ms`);
    console.log('═'.repeat(60));

    try {
        // Step 1: Initialize NAR system
        console.log('\n📋 STEP 1: Initializing NAR system...');
        nar = new NAR({
            cycleInterval: 1000, // 1 second intervals (won't use continuous mode)
            enableLogging: true
        });
        console.log('✅ NAR system initialized');
        console.log(`   - Memory: ${nar.memory ? 'Ready' : 'Not available'}`);
        console.log(`   - Focus: ${nar.focus ? 'Ready' : 'Not available'}`);
        console.log(`   - Reasoner: ${nar.reasoner ? 'Ready' : 'Not available'}`);
        console.log(`   - Clock: ${nar.clock ? 'Ready' : 'Not available'}`);

        // Step 2: Set up LM provider
        console.log('\n📋 STEP 2: Setting up LM provider...');
        const lmConfig = {
            apiKey: '',
            baseURL: 'http://xyz:11434',
            modelName: 'llamablit',
            temperature: 0.7,
            maxTokens: 1000,
            timeout: 15000
        };

        // Create LM provider instance for the rule
        const { setupLangChainProvider } = await import('../core/lm/LangChainSetup.js');

        // Create a basic LM instance first
        const { default: LM } = await import('../core/lm/LM.js');
        const lmProvider = new LM();

        // Set up the LangChain provider (doesn't require API key)
        setupLangChainProvider(lmProvider, lmConfig, 'langchain');

        console.log('✅ LM provider configured');
        console.log(`   - Model: ${lmConfig.modelName}`);
        console.log(`   - Endpoint: ${lmConfig.baseURL}`);
        console.log(`   - Temperature: ${lmConfig.temperature}`);
        console.log(`   - Max tokens: ${lmConfig.maxTokens}`);

        // Step 3: Set up GoalDecompositionRule
        console.log('\n📋 STEP 3: Setting up GoalDecompositionRule...');
        decompositionRule = new GoalDecompositionRule(lmProvider, {
            temperature: 0.7,
            maxTokens: 800,
            timeout: 12000,
            minSubGoals: 2,
            maxSubGoals: 5
        });

        // Add the rule to NAR's reasoner
        if (nar.reasoner && typeof nar.reasoner.registerRule === 'function') {
            nar.reasoner.registerRule(decompositionRule);
            console.log('✅ GoalDecompositionRule registered with reasoner');
        } else {
            console.log('⚠️  Could not register rule with reasoner (method not available)');
            console.log(`   Available methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(nar.reasoner)).filter(name => name !== 'constructor')}`);
        }

        console.log('✅ GoalDecompositionRule configured');
        console.log(`   - Temperature: ${decompositionRule.config.temperature}`);
        console.log(`   - Max tokens: ${decompositionRule.config.maxTokens}`);
        console.log(`   - Sub-goals range: ${decompositionRule.config.minSubGoals}-${decompositionRule.config.maxSubGoals}`);

        // Set the LM provider on the reasoner so rules can access it
        nar.reasoner.setLM(lmProvider);
        console.log('✅ LM provider connected to reasoner');

        // Step 4: Test rule independently before system integration
        console.log('\n📋 STEP 4: Testing GoalDecompositionRule independently...');
        const testGoalTask = {
            term: DEMO_GOAL.slice(0, -1), // Remove '!' for term
            punctuation: '!',
            truth: { frequency: 0.9, confidence: 0.9 },
            priority: 0.8  // Add priority to ensure rule can apply
        };

        const testContext = { premise: { task: testGoalTask } };
        console.log(`🎯 Testing with goal: "${testGoalTask.term}!"`);

        const inputTask = nar.input(DEMO_GOAL);

        const canApply = decompositionRule.canApply(testContext);
        console.log(`🔍 Rule can apply: ${canApply}`);

        if (canApply) {
            console.log('🔄 Executing rule independently...');
            const ruleTasks = await decompositionRule.apply(testContext);

            console.log(`✅ Rule execution complete`);        

            ruleTasks.forEach((task, index) => {
                const content = task.term ? task.term.toString() : 'Unknown';
                const truth = task.truth ? `(f=${task.truth.frequency.toFixed(2)}, c=${task.truth.confidence.toFixed(2)})` : '';
                console.log(`   ${index + 1}. ${content} ${truth}`);
                nar.input(task);
            });
        } else {
            console.log('❌ Rule cannot apply to this goal');
        }

        // Step 5: Add natural language goal to NAR system
        console.log('\n📋 STEP 5: Adding natural language goal to NAR system...');
        console.log(`📥 Input: "${DEMO_GOAL}"`);

        console.log('✅ Goal added to system');
        console.log(`   - Task ID: ${inputTask.hashCode ? inputTask.hashCode() : 'N/A'}`);
        console.log(`   - Term: ${inputTask.term ? inputTask.term.toString() : 'Unknown'}`);
        console.log(`   - Punctuation: ${inputTask.punctuation}`);
        console.log(`   - Truth: f=${inputTask.truth?.frequency || 0}, c=${inputTask.truth?.confidence || 0}`);

        // Step 6: Show system state before cycle
        console.log('\n📋 STEP 6: System state before reasoning cycle...');

        const preCycleTasks = nar.getTasks();
        console.log(`📋 Current tasks in memory:`);
        preCycleTasks.forEach((task, index) => {
            const content = task.term ? task.term.toString() : 'Unknown';
            const truth = task.truth ? `(f=${task.truth.frequency.toFixed(2)}, c=${task.truth.confidence.toFixed(2)})` : '';
            console.log(`   ${index + 1}. ${content} ${truth}`);
        });

        // Step 7: Execute single reasoning cycle
        console.log('\n📋 STEP 7: Executing single reasoning cycle...');
        console.log('🔄 Running NAR cycle (this should trigger GoalDecompositionRule)...');

        //nar.runCycle();

        console.log('✅ Reasoning cycle completed');

        // Step 8: Show system state after cycle
        console.log('\n📋 STEP 8: System state after reasoning cycle...');

        const postCycleTasks = nar.getTasks();
        console.log(`📋 Tasks in memory after cycle:`);
        postCycleTasks.forEach((task, index) => {
            const content = task.term ? task.term.toString() : 'Unknown';
            const truth = task.truth ? `(f=${task.truth.frequency.toFixed(2)}, c=${task.truth.confidence.toFixed(2)})` : '';
            const type = task.punctuation === '!' ? '[GOAL]' : task.punctuation === '?' ? '[QUESTION]' : '[BELIEF]';
            console.log(`   ${index + 1}. ${type} ${content} ${truth}`);
        });

        // Step 9: Analyze results
        console.log('\n📋 STEP 9: Analyzing results...');
        // Step 10: Cleanup
        console.log('\n📋 STEP 10: Cleanup and shutdown...');
        if (nar.isRunning()) {
            nar.stop();
            console.log('✅ NAR system stopped');
        }

        console.log('\n🎉 Demo completed successfully!');
        console.log('═'.repeat(60));

    } catch (error) {
        console.error('\n❌ Demo failed:', error.message);
        console.error('Stack trace:', error.stack);

        // Cleanup on error
        if (nar && nar.isRunning()) {
            nar.stop();
        }

        process.exit(1);
    }
}

// Handle shutdown signals
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT - shutting down gracefully...');
    if (nar && nar.isRunning()) {
        nar.stop();
    }
    process.exit(0);
});

// Run the demo
runCompleteNARDemo().catch(error => {
    console.error('Unhandled error in demo:', error);
    process.exit(1);
});