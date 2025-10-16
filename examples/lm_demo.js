#!/usr/bin/env node

/**
 * @file: examples/lm_demo.js
 * @description: Example demonstrating LM integration with reasoning rules.
 */

import System from '../core/system/System.js';
import { setupLangChainProvider } from '../core/lm/LangChainSetup.js';
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

// Default configuration
const DEFAULT_INPUT = "Ensure Earth Happiness!";
const DEFAULT_LM_PROVIDER = "langchain";

let system = null;

/**
 * Initialize the SeNARS System
 */
async function initializeSystem(options) {
    const { provider, apiKey, baseURL, modelName } = options;
    const effectiveProvider = provider || 'langchain'; // Changed from 'xenova' to 'langchain'
    console.log('🚀 Initializing SeNARS Neurosymbolic System...');

    try {
        // Initialize system with fallback LM for testing
        const config = {
            components: {
                lm: {
                    provider: createFallbackLM(),  // Use fallback LM for immediate testing
                    fallbackEnabled: true
                },
                webSocketServer: {
                    enabled: false
                }
            }
        };

        system = new System(config);
        await system.start();

        // Set up the LangChain provider after system starts (only if not using fallback mode)
        if (effectiveProvider === 'langchain' && system.core?.lm) {
            try {
                // Check if we should use fallback instead
                const useFallback = process.env.USE_FALLBACK_LM === 'true' || args.includes('--use-fallback');

                if (useFallback) {
                    console.log('ℹ️  Using fallback LM for demonstration (forced via environment variable or flag)');
                } else {
                    // Only set up real provider if fallback isn't requested
                    setupLangChainProvider(
                        system.core.lm,
                        {
                            apiKey: apiKey,
                            baseURL: baseURL,
                            modelName: modelName
                        },
                        'langchain'
                    );
                    console.log('✅ LangChain provider configured successfully');
                    console.log(`   Model: ${modelName}`);
                    console.log(`   URL: ${baseURL}`);
                    console.log(`   API Key: ${apiKey ? 'Provided' : 'Empty'}`);
                }
            } catch (setupError) {
                console.error('❌ Failed to configure LangChain provider:', setupError.message);
                console.log('ℹ️  Continuing with fallback LM for demonstration');
            }
        } else {
            console.log('ℹ️  Using fallback LM for demonstration');
        }

        if (system.core.focus) {
            system.core.focus.setFocus('default');
            console.log('🎯 Focus set activated');
        }

        console.log('✅ System initialized with integrated neural and symbolic components');
        return system;
    } catch (error) {
        console.error('❌ Failed to initialize system:', error);
        throw error;
    }
}

/**
 * Add initial input tasks to the system
 */
async function addInitialTasks(system, inputText) {
    console.log(`📥 Adding initial input: "${inputText}"`);
    try {
        await system.input({
            term: inputText,
            punctuation: '!', // Goal
            truth: { frequency: 0.9, confidence: 0.9 }
        });
        console.log('✅ Initial tasks added to system');
    } catch (error) {
        console.error('❌ Failed to add initial tasks:', error);
    }
}

/**
 * Setup neurosymbolic integration rules
 */
function setupNeurosymbolicRules() {
    if (!system || !system.core || !system.core.reasoning) {
        console.error("❌ System not ready for rule registration");
        throw new Error("System not ready for rule registration");
    }

    try {
        // Check if LM is available and configured properly
        const lm = system.core.lm;
        if (!lm) {
            console.error("❌ LM component not available in system");
            throw new Error("LM component not available in system");
        }
        
        // Check that LM is available (can be fallback or real provider)
        if (!lm || !lm.process) {
            console.error("❌ LM not available - need either fallback LM or configured provider");
            throw new Error("LM not available - need either fallback LM or configured provider");
        }
        
        console.log("✅ LM provider is properly configured and available");

        const rules = [
            new GoalDecompositionRule(lm),
            new HypothesisGenerationRule(lm),
            new VariableGroundingRule(lm),
            new BeliefRevisionRule(lm),
            new ExplanationGenerationRule(lm),
            new SchemaInductionRule(lm),
            new UncertaintyCalibrationRule(lm),
            new TemporalCausalModelingRule(lm),
            new MetaReasoningGuidanceRule(lm),
            new InteractiveClarificationRule(lm),
            new AnalogicalReasoningRule(lm)
        ];

        for (const rule of rules) {
            system.core.reasoning.registerRule(rule);
        }

        console.log(`✅ All ${rules.length} neurosymbolic rules registered with reasoner`);
    } catch (error) {
        console.error('❌ Error registering neurosymbolic rules:', error);
        throw error;
    }
}

/**
 * Create a fallback LM for demonstration when actual LM providers aren't available
 */
function createFallbackLM() {
    const lm = {
        generateText: async (prompt, options = {}) => {
            // Simple fallback responses for demo purposes
            if (prompt.includes('Decompose this goal')) {
                return `1. "Plant more trees"
2. "Reduce pollution"
3. "Promote renewable energy"
4. "Educate people about environmental protection"`;
            } else if (prompt.includes('hypothesize')) {
                return `Based on the observations, a possible hypothesis is that increased environmental awareness leads to sustainable practices.`;
            } else if (prompt.includes('explain')) {
                return `The explanation is that environmental protection requires collective action and awareness.`;
            } else {
                return `Generated response for: ${prompt.substring(0, 50)}...`;
            }
        },
        process: async (prompt, options = {}) => {
            return await lm.generateText(prompt, options);
        },
        _getProvider: () => null  // Indicates no real provider is available
    };
    return lm;
}

/**
 * Main function to run the demo
 */
async function runDemo(options) {
    const { input, provider, timeLimit } = options;

    console.log('🚀 SeNARS LM Demo - Console Mode');
    console.log(`📥 Initial Input: "${input}"`);
    console.log(`🤖 LM Provider: ${options.provider}`);
    console.log(`🎯 Model: ${options.modelName}`);
    console.log(`🔗 URL: ${options.baseURL}`);
    console.log(`🔑 API Key: ${options.apiKey ? 'Provided' : 'Empty (as required)'}`);
    console.log(`⏱️  Time Limit: ${timeLimit ? `${timeLimit}ms` : 'None'}`);
    console.log('--- Starting system ---');

    try {
        await initializeSystem(options);
        await addInitialTasks(system, input);
        setupNeurosymbolicRules();

        if (system) {
            system.on('task.input', (task) => {
                const termContent = task.term ? (typeof task.term.toString === 'function' ? task.term.toString() : task.term) : 'No term';
                console.log(`📥 Task input: ${termContent} (${task.punctuation})`);
            });
            system.on('task.derived', (task) => {
                console.log('🔍 New derivation event received');
                console.log('   Task object:', JSON.stringify(task, null, 2));
                let content = 'No content';
                if (task && typeof task === 'object') {
                    if (task.content) {
                        console.log('   Task has content property:', JSON.stringify(task.content, null, 2));
                        // If task has a content property, use it directly
                        content = typeof task.content === 'string' ? task.content :
                                  typeof task.content === 'object' && task.content.term ?
                                  (typeof task.content.term.toString === 'function' ? task.content.term.toString() : String(task.content.term)) :
                                  String(task.content);
                    } else if (task.term) {
                        console.log('   Task has term property:', JSON.stringify(task.term, null, 2));
                        // If task has a term property, try to get its string representation
                        content = typeof task.term.toString === 'function' ? task.term.toString() :
                                  typeof task.term === 'string' ? task.term :
                                  JSON.stringify(task.term);
                    } else {
                        console.log('   Task has no content or term property');
                        // If task itself has a toString method, use that
                        content = typeof task.toString === 'function' ? task.toString() :
                                  JSON.stringify(task);
                    }
                } else {
                    console.log('   Task is not an object:', typeof task);
                    content = String(task);
                }
                const truth = task.truth ? `(f=${task.truth.frequency.toFixed(2)}, c=${task.truth.confidence.toFixed(2)})` : '';
                console.log(`🔬 Final derivation: ${content} ${truth}`);
            });
            system.on('cycle.stats', (stats) => console.log(`🔄 Cycle ${stats.cycles} executed at ${new Date(stats.timestamp).toLocaleTimeString()}`));
            system.on('reasoning_error', (error) => console.log(`⚠️  Reasoning error: ${error.message || error}`));
            system.on('lm.consulted', (data) => console.log(`🤖 LM consulted: ${data.purpose || 'Unknown purpose'}`));
            system.on('goal_decomposed', (data) => console.log(`🌳 Goal decomposed: ${data.goal} → ${data.subgoals?.length || 0} subtasks`));
            system.on('hypothesis_generated', (data) => console.log(`💡 Hypothesis generated: ${data.hypothesis}`));
            system.on('symbol_grounded', (data) => console.log(`🔗 Symbol grounded: ${data.symbol} → ${data.meaning}`));
            system.on('belief_revised', (data) => console.log(`✅ Belief revised: ${data.original} → ${data.revised}`));
        }

        console.log('✅ System initialized');
        console.log(`📥 Input received: "${input}"`);
        console.log('🎯 Ready to start reasoning cycles...');

        // Ensure the reasoning cycle is properly started and running
        if (system.core && system.core.cycle) {
            if (!system.core.cycle.isRunning) {
                console.log('🔄 Starting reasoning cycle...');
                await system.core.cycle.start();
                console.log('✅ Cycle started successfully');
            }
            system.core.cycle.resume();
            console.log('▶️  Cycle resumed');
        } else {
            console.error('❌ Critical error: Cycle component not available!');
            throw new Error('System cycle component is not available - required for reasoning cycles');
        }

        let isShuttingDown = false;
        async function shutdown() {
            if (isShuttingDown) return;
            isShuttingDown = true;
            console.log('\n🛑 Shutting down system...');
            if (system) {
                await system.stop().catch(console.error);
            }
            process.exit(0);
        }

        if (timeLimit) {
            setTimeout(() => {
                console.log(`\n⏰ Time limit of ${timeLimit}ms reached.`);
                shutdown();
            }, timeLimit);
        }

        process.on('SIGINT', shutdown);

    } catch (error) {
        console.error('❌ Failed to run demo:', error);
        process.exit(1);
    }
}

/**
 * Parse command line arguments
 */
function parseArguments() {
    const args = process.argv.slice(2);
    const options = {
        input: DEFAULT_INPUT,
        provider: DEFAULT_LM_PROVIDER,
        timeLimit: null,
        apiKey: '', // Empty string as specified in requirements
        baseURL: 'http://xyz:11434', // URL as specified in requirements
        modelName: 'llamablit' // Model as specified in requirements
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--input':
            case '-i':
                options.input = args[++i];
                break;
            case '--provider':
            case '-p':
                options.provider = args[++i];
                break;
            case '--timelimit':
                options.timeLimit = parseInt(args[++i]);
                break;
            case '--api-key':
                options.apiKey = args[++i];
                break;
            case '--base-url':
                options.baseURL = args[++i];
                break;
            case '--model-name':
                options.modelName = args[++i];
                break;
            case '--console':
                // This is the default mode for this script, so we can ignore it.
                break;
        }
    }
    return options;
}

const options = parseArguments();
runDemo(options).catch(console.error);
