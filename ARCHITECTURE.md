# SeNARS Architecture Overview

This document outlines the architecture of the SeNARS system, detailing the core components, their interactions, and the overall system design.

## System Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    SeNARS Core                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Memory    │  │  Reasoning  │  │  Tools      │              │
│  │  Component  │  │  Component  │  │  Component  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    Cycle    │  │     Self    │  │      LM     │              │
│  │  Component  │  │  Component  │  │  Component  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Plugins   │  │   Config    │  │   Messages  │              │
│  │  Component  │  │   System    │  │   System    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Core Cognitive Cycle Specification

### Cycle Phase Definitions

| Phase              | Component         | Description                               | Input             | Output             | Performance Target |
|--------------------|-------------------|-------------------------------------------|-------------------|--------------------|--------------------|
| **Perception**     | `TaskFactory`     | Convert external input to Tasks           | Raw input/events  | Structured Tasks   | < 10ms per task    |
| **Prioritization** | `PriorityManager` | Calculate task priorities                 | All active tasks  | Priority scores    | < 5ms for 1000 tasks|
| **Focus Selection**| `Cycle.selectFocusSet` | Select tasks for current cycle         | Prioritized tasks | Focus set (N tasks)| < 1ms selection    |
| **Reasoning**      | `Reasoner`        | Apply inference rules                     | Focus set         | Derived tasks      | < 50ms per cycle   |
| **Meta-Cognition** | `MetaCognition`   | Detect contradictions/conflicts           | New knowledge     | Resolution tasks   | < 20ms analysis    |
| **Neural Enrichment**| `LM`              | Generate creative insights                | Reasoning gaps    | Enriched knowledge | < 2000ms responses |
| **Planning**       | `Planner`         | Create action sequences                   | Goal tasks        | Execution plans    | < 100ms planning   |
| **Action Execution**| `ActionExecutor`  | Execute planned actions                   | Valid plans       | Action results     | Variable by action |
| **Learning**       | `Memory`          | Consolidate new knowledge                 | Experience        | Updated beliefs    | < 10ms integration |

### Focus Set Selection Algorithm

```typescript
interface FocusSetSelection {
  maxSize: number;           // Maximum tasks per cycle
  priorityThreshold: number; // Minimum priority for inclusion
  diversityFactor: number;   // Encourage cognitive diversity
  urgencyWeight: number;     // Weight for time-critical tasks
  goalAlignmentWeight: number; // Weight for goal relevance
}
```

## Neuro-Symbolic Integration Specification

### LM Service Interface (Language-Agnostic)

```typescript
interface LMService {
  // Core capabilities
  generateText(prompt: string, options?: GenerationOptions): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
  answerQuestion(context: string, question: string): Promise<Answer>;

  // Advanced features
  generateHypothesis(observations: string[], constraints: string[]): Promise<Hypothesis[]>;
  repairPlan(failedPlan: Plan, error: Error): Promise<Plan>;
  explainReasoning(reasoningTrace: ReasoningStep[]): Promise<Explanation>;
  findSimilarConcepts(concept: string, domain?: string): Promise<SimilarConcept[]>;
}

interface GenerationOptions {
  temperature?: number;      // 0.0-2.0, creativity vs consistency
  maxTokens?: number;       // Maximum response length
  stopSequences?: string[]; // Sequences that stop generation
  provider?: string;        // Specific provider override
}
```

### Embedding Integration

```typescript
interface EmbeddingService {
  // Vector operations
  generate(text: string): Promise<number[]>;
  similarity(vector1: number[], vector2: number[]): number;
  findNearest(query: number[], candidates: number[][], k: number): VectorSearchResult[];

  // Semantic operations
  analogicalMatch(source: string, target: string): AnalogyResult;
  clusterConcepts(concepts: string[], threshold: number): ConceptCluster[];
  semanticInterpolation(concept1: string, concept2: string, weight: number): string;
}
```

## Component Interface Specification

### Base Component Protocol

```typescript
interface Component {
  // Lifecycle management
  initialize(config: ComponentConfig): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  destroy(): Promise<void>;

  // Health and monitoring
  getHealth(): ComponentHealth;
  getMetrics(): ComponentMetrics;
  getStatus(): ComponentStatus;

  // Event handling
  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  emit(event: string, data: any): void;
}

interface ComponentConfig {
  name: string;
  version: string;
  dependencies: string[];
  config: { [key: string]: any };
}
```

## Core Components

The system is composed of several core components, each with a specific responsibility.

### 1. Core Foundation (`core/`)
The central orchestrator, managing component lifecycle, messaging, and rules.

### 2. Specialized Components
- **Memory**: Manages task and term storage, caching, and querying.
- **Reasoning**: Applies inference rules and manages reasoning strategies.
- **Cycle**: Controls the adaptive cognitive cycle.
- **LM (Language Model)**: Integrates with large language models.
- **Tools**: Executes external tools and actions.
- **Plugins**: Manages dynamic plugins and hot-reloading.
- **Self**: Handles self-optimization and monitoring.

## Key Innovations

- **Metaprogramming-Driven Design**: Dynamic, proxy-based component interaction.
- **Winnowing-Based Rule Evaluation**: Efficient pre-filtering of inference rules.
- **Unified Communication Architecture**: A single system for events and commands.
- **Multi-Modal Intelligence Integration**: Combines symbolic reasoning with neural network capabilities.