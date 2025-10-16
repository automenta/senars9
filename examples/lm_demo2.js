#!/usr/bin/env node

/**
 * @file: examples/lm_demo2.js
 * @description: Minimal LM demo to test LangChain provider configuration
 */

import System from '../core/system/System.js';
import { setupLangChainProvider } from '../core/lm/LangChainSetup.js';
import { GoalDecompositionRule } from '../core/reasoning/lm/rules/GoalDecompositionRule.js';

const DEMO_INPUT = "Test environmental sustainability!";
const DEMO_TIMEOUT = 5000; // 5 seconds

let system = null;

async function runMinimalDemo() {
    console.log('🚀 Starting minimal LM demo...');
    console.log(`📥 Input: "${DEMO_INPUT}"`);
    console.log(`🤖 Provider: langchain`);
    console.log(`🎯 Model: llamablit`);
    console.log(`🔗 URL: http://xyz:11434`);
    console.log(`🔑 API Key: (empty)`);
    console.log(`⏱️  Timeout: ${DEMO_TIMEOUT}ms`);
    console.log('---');

    try {
        // Initialize system with minimal config
        const config = {
            components: {
                lm: {
                    provider: null,
                    fallbackEnabled: false
                },
                webSocketServer: {
                    enabled: false
                }
            }
        };

        system = new System(config);
        await system.start();

        // Configure LangChain provider with enhanced settings for better LM responses
        if (system.core?.lm) {
            try {
                setupLangChainProvider(
                    system.core.lm,
                    {
                        apiKey: '', // Empty for local Ollama
                        baseURL: 'http://xyz:11434',
                        modelName: 'llamablit',
                        temperature: 0.7, // Moderate creativity for meaningful responses
                        maxTokens: 1500,  // Allow for substantial responses
                        timeout: 30000    // 30 second timeout for LM calls
                    },
                    'langchain'
                );
                console.log('✅ LangChain provider configured with enhanced settings');
                console.log('🔧 Provider config: llamablit @ http://xyz:11434 (30s timeout)');
            } catch (error) {
                console.error('❌ Failed to configure LangChain provider:', error.message);
                throw error;
            }
        }

        // Test GoalDecompositionRule with a sample goal
        if (system.core?.lm) {
            try {
                console.log('\n🧪 Testing GoalDecompositionRule...');

                // Create a sample goal task for testing
                const testGoal = "Improve environmental sustainability in our daily operations";
                console.log(`🎯 Test goal: "${testGoal}"`);

                // Create a task object for the rule
                const goalTask = {
                    term: testGoal,
                    punctuation: '!',
                    truth: { frequency: 0.9, confidence: 0.9 },
                    priority: 0.8
                };

                // Set up the GoalDecompositionRule with the LM provider
                const decompositionRule = new GoalDecompositionRule(system.core.lm, {
                    temperature: 0.7,
                    maxTokens: 600,
                    timeout: 10000
                });

                console.log('⚙️  GoalDecompositionRule configured and ready');

                // Test if the rule can apply to this goal
                const context = { premise: { task: goalTask } };
                const canApply = decompositionRule.canApply(context);

                if (!canApply) {
                    console.log('❌ GoalDecompositionRule cannot apply to this goal');
                    console.log('💡 This might indicate LM provider issues or goal format problems');
                } else {
                    console.log('✅ GoalDecompositionRule can apply to this goal');

                    // Apply the rule to decompose the goal
                    console.log('🔄 Applying GoalDecompositionRule...');
                    const newTasks = await decompositionRule.apply(context);

                    if (newTasks && newTasks.length > 0) {
                        console.log(`✅ GoalDecompositionRule SUCCESS: Generated ${newTasks.length} tasks`);

                        // Show the first few generated tasks
                        const displayCount = Math.min(4, newTasks.length);
                        for (let i = 0; i < displayCount; i++) {
                            const task = newTasks[i];
                            const content = task.term ? task.term.toString() : task.toString ? task.toString() : 'Unknown';
                            const truth = task.truth ? `(f=${task.truth.frequency.toFixed(2)}, c=${task.truth.confidence.toFixed(2)})` : '';
                            console.log(`   ${i + 1}. ${content} ${truth}`);
                        }

                        if (newTasks.length > displayCount) {
                            console.log(`   ... and ${newTasks.length - displayCount} more tasks`);
                        }
                    } else {
                        console.log('❌ GoalDecompositionRule generated no tasks');
                        console.log('💡 This might indicate LM response parsing issues');
                    }
                }

            } catch (error) {
                console.error(`❌ GoalDecompositionRule Test FAILED: ${error.message}`);
                console.error('💡 This indicates issues with the rule or LM provider integration');
                // Continue with the demo anyway for testing purposes
            }
        }

        // Set focus
        if (system.core.focus) {
            system.core.focus.setFocus('default');
        }

        // Add initial input (can be processed by the GoalDecompositionRule)
        await system.input({
            term: DEMO_INPUT,
            punctuation: '!',
            truth: { frequency: 0.9, confidence: 0.9 }
        });
        console.log('✅ Input added to system');
        console.log(`📝 Input goal: "${DEMO_INPUT}" (can be decomposed by GoalDecompositionRule)`);

        // Set up comprehensive event handlers to monitor LM responses
        system.on('task.input', (task) => {
            console.log(`📥 Input: "${task.term}" (${task.punctuation})`);
        });

        system.on('task.derived', (task) => {
            const content = task.content || task.term?.toString?.() || 'Unknown';
            const truth = task.truth ? `(f=${task.truth.frequency.toFixed(2)}, c=${task.truth.confidence.toFixed(2)})` : '';
            console.log(`🔬 Derived: ${content} ${truth}`);
        });

        system.on('task.processed', (task) => {
            const content = task.content || task.term?.toString?.() || 'Unknown';
            console.log(`⚡ Processed: ${content}`);
        });

        system.on('cycle.stats', (stats) => {
            console.log(`🔄 Cycle ${stats.cycles} completed at ${new Date(stats.timestamp).toLocaleTimeString()}`);
        });

        // Monitor for LM provider activity
        system.on('lm.request', (data) => {
            console.log(`🤖 LM Request: ${data.provider} -> "${data.prompt?.substring(0, 50)}..."`);
        });

        system.on('lm.response', (data) => {
            console.log(`🤖 LM Response: ${data.provider} -> "${data.response?.substring(0, 50)}..." (${data.response?.length || 0} chars)`);
        });

        system.on('lm.error', (error) => {
            console.log(`❌ LM Error: ${error.provider} -> ${error.message}`);
        });

        // Execute exactly one cycle manually for precise control
        if (system.core?.cycle) {
            console.log('▶️  Executing single reasoning cycle...');

            // Stop the cycle timer to prevent continuous execution
            if (system.core.cycle.cycleTimer) {
                clearInterval(system.core.cycle.cycleTimer);
                system.core.cycle.cycleTimer = null;
                system.core.cycle.isRunning = false;
            }

            // Execute exactly one cycle manually
            await system.core.cycle._runCycle();
            console.log('✅ Single cycle completed - shutting down...');

            // Shutdown after a brief delay to allow processing to complete
            setTimeout(async () => {
                if (system) {
                    await system.stop();
                }
                process.exit(0);
            }, 2000); // Give it 2 seconds to finish processing
        }

        // Set a reasonable timeout in case the single cycle hangs
        setTimeout(async () => {
            console.log(`\n⏰ Timeout after ${DEMO_TIMEOUT}ms - forcing shutdown`);
            if (system) {
                await system.stop();
            }
            process.exit(0);
        }, DEMO_TIMEOUT);

    } catch (error) {
        console.error('❌ Demo failed:', error.message);
        if (system) {
            await system.stop().catch(console.error);
        }
        process.exit(1);
    }
}

// Handle shutdown signals
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    if (system) {
        await system.stop().catch(console.error);
    }
    process.exit(0);
});

runMinimalDemo().catch(console.error);