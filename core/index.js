export { default as LM } from './lm/LM.js';
export { default as LangChainProvider } from './lm/LangChainProvider.js';
export { setupLangChainProvider, createLMWithLangChain } from './lm/LangChainSetup.js';
export { default as XenovaProvider } from './lm/XenovaProvider.js';
export { setupXenovaProvider, createLMWithXenova } from './lm/XenovaSetup.js';

// Export enhanced LM functionality (same as standard for now)

// Export modular LM components
export { default as MetricsTracker } from './lm/MetricsTracker.js';
export { default as ResourceManager } from './lm/ResourceManager.js';
export { default as WorkflowEngine } from './lm/WorkflowEngine.js';
export { default as ReasoningSystem } from './lm/ReasoningSystem.js';
export { default as ReasoningEngine } from './lm/ReasoningEngine.js';
export { default as NarseseTranslator } from './lm/NarseseTranslator.js';
export { default as JSONSerializer } from './lm/JSONSerializer.js';
export { default as StreamingProcessor } from './lm/StreamingProcessor.js';
export { default as ProtocolAdapters } from './lm/ProtocolAdapters.js';
export { default as ProviderRegistry } from './lm/ProviderRegistry.js';
export { default as ModelSelector } from './lm/ModelSelector.js';
export { default as IOAdapterManager } from './lm/IOAdapterManager.js';
export { default as LMConfiguration } from './lm/LMConfiguration.js';
export { ProviderSetup } from './lm/ProviderSetup.js';

// Export core NARS reasoning components
export { Term, TermType } from './Term.js';
export { Task, Punctuation, TruthValue } from './Task.js';
export { Concept } from './Concept.js';
export { TaskTable, SelectionCriteria, DefaultAggregationFunctions } from './TaskTable.js';
export { Answer } from './Answer.js';

// Export core cognitive architecture components
export { default as Bag } from './memory/Bag.js';
export { default as AdjacencyBag } from './memory/AdjacencyBag.js';
export { default as GraphTraversal } from './memory/GraphTraversal.js';

// Export cognitive cycle components
export { FocusSetSelector } from './FocusSetSelector.js';
export { Clock, IterativeClock, UnixTimeClock, HighResolutionClock } from './Clock.js';
export { CycleContext, runSingleCycle } from './Cycle.js';
export { Memory } from './Memory.js';
export { Reasoner, InferenceRule, RuleEngine } from './Reasoner.js';
export { default as System } from './system/System.js';
export { parse, parseTerm } from './parser/Parser.js';



// Export planning components
export { default as HTNPlanner } from './plan/HTNPlanner.js';
export { default as AStarPlanner } from './plan/AStarPlanner.js';

// Export analysis components
export { default as DataIngestor } from './analysis/DataIngestor.js';
export { default as ReportGenerator } from './analysis/ReportGenerator.js';

export { default as PatternDetector } from './analysis/PatternDetector.js';

// Export Phase 3 metacognition components
export { ContradictionAnalyzer } from './reasoning/ContradictionAnalyzer.js';
export { ResolutionStrategy } from './reasoning/ResolutionStrategy.js';

// Export additional cognitive components
export { 
  applySyllogisticRule, 
  SyllogisticRule, 
  DeductiveSyllogism, 
  Induction, 
  Abduction 
} from './reasoning/SyllogisticRules.js';
export { ModusPonens } from './reasoning/ModusPonensRule.js';
export { Analogy } from './reasoning/AnalogyRule.js';

export {
  Component,
  ComponentHealth,
  ComponentMetrics,
  ComponentStatus,
  ComponentConfig
} from './components/Component.js';
export { ValidationUtils } from './base/ValidationUtils.js';
export { ConfigService } from './components/ConfigService.js';
export { UnifiedResourceManager } from './components/UnifiedResourceManager.js';
export { StrategyRegistry } from './components/StrategyRegistry.js';
export { SystemContext } from './components/SystemContext.js';
export { UnifiedAnalysisEngine } from './components/UnifiedAnalysisEngine.js';
export { PlanExecutor } from './components/PlanExecutor.js';