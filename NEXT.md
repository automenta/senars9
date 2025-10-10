# NEXT.complete.md - SeNARS Master Development Plan
## A Comprehensive Roadmap for a Self-Improving Cognitive Architecture

---

## Part 1: The Strategic Roadmap

### **Executive Summary**
This document outlines the master strategic development plan for SeNARS. It fuses the vision of a **self-leveraging, self-improving cognitive architecture** with a pragmatic, fundamentals-first implementation plan. By systematically enabling the system to participate in its own development, we will achieve an exponential return on our efforts. This plan is comprehensive, ensuring all previously discussed functionality is retained and strategically prioritized.

### **Architectural Principles**
1.  **Fundamentals First**: Prioritize the core cognitive loop and the components that enable self-reflection and self-modification.
2.  **Everything is a Goal**: Frame all development tasks as machine-readable goals that the system can parse, plan, and execute.
3.  **Metaprogramming & Self-Leverage**: Use the system's own intelligence (LM, planning) to generate code, tests, and documentation.
4.  **Declarative Planning**: Define *what* needs to be done in development plans, allowing the system's planners to determine *how*.

### **The Phased Path to Autonomy**

#### **Phase 1: Foundational Stability (CURRENT STATE)**
**Complete.** We have a stable and performant platform comprising the core components of a cognitive architecture. This provides the launchpad for our self-improvement strategy.

#### **Phase 2: Introspection & Bootstrapping (IMMEDIATE PRIORITY)**
**Goal**: To create the core self-development loop. This is the most critical phase.
1.  **Enable Observability (`WebSocketServer`)**: Implement a real-time communication channel to monitor and interact with the system's internal state.
2.  **Enable Self-Direction (`BootstrapSystem`)**: Implement the core component that reads this development plan and converts its directives into a tree of cognitive goals.
3.  **First Self-Development Goal**: The `BootstrapSystem`'s first task will be to orchestrate the implementation of the **`PatternDetector`**, proving the viability of the self-development loop.

#### **Phase 3: The Path to Metacognition (MID-TERM PRIORITY)**
**Goal**: With the core loop established, we enhance the system's ability to reason about its own state and knowledge, forming the basis of metacognition.
1.  **Advanced Pattern Recognition (`PatternDetector`)**: The system implements its own pattern-detection capabilities, allowing it to find sophisticated correlations in data and its own behavior.
2.  **Logical Consistency (`ContradictionAnalyzer`, `ResolutionStrategy`)**: The system learns to detect and resolve logical contradictions, a crucial step towards robust reasoning.
3.  **Dynamic Reasoning (`StrategyRegistry`, `SystemContext`)**: The system can dynamically select the best reasoning strategy for a given problem, optimizing its own thought processes.

#### **Phase 4: Architectural Refinement & Tooling (DEFERRED)**
**Goal**: Once the system is stable, self-directed, and reasons effectively, we will implement advanced architectural patterns and AI-powered tooling.
1.  **Architectural Elegance (`DIContainer`, `CommandBus`)**: Refine the system's architecture for improved modularity and testability.
2.  **Automated Diagnostics (`UnitTestAnalyzer`)**: The system learns to analyze its own test failures and suggest fixes.
3.  **AI-Powered Metaprogramming**: The system uses its LM to scaffold new components, write boilerplate code, and generate documentation.

#### **Phase 5: Knowledge & Expansion (FUTURE)**
**Goal**: Broaden the system's knowledge base and ability to interact with the world.
1.  **Knowledge Base Integration**: Import external ontologies like **SUMO, WordNet, and Wikidata** to provide a vast foundation of world knowledge.
2.  **Advanced Data Ingestion**: Expand support for various external data formats and real-time streams.

---

## Part 2: Component-Level Implementation Plan

### **Phase 1: Foundational Components (✅ COMPLETE)**
*   **Core Engine**: `Term`, `Task`, `Concept`, `Cycle`, `Clock`, `System`, `Core`
*   **Reasoning & Rules**: `Rules`, `SyllogisticRules`, `ModusPonensRule`, `AnalogyRule`, `Reasoner`
*   **Memory & Knowledge**: `Memory`, `Bag`, `AdjacencyBag`, `GraphTraversal`
*   **Planning**: `AStarPlanner`, `HTNPlanner`, `PlanProcessor`, `PlanExecutor`
*   **Language Model (LM)**: `LM`, `LangChainProvider`, `XenovaProvider`, `LMConfiguration`, `ModelSelector`, `NarseseTranslator`
*   **Analysis & Configuration**: `AnalysisEngine`, `DataIngor`, `ReportGenerator`, `Config`, `ConfigManager`
*   **Testing & Validation**: Comprehensive unit/integration tests and examples.

### **Phase 2: Introspection & Bootstrapping (🔥 IMMEDIATE PRIORITY)**
*   **Component**: `WebSocketServer`
    *   **Status**: 🔲
    *   **Implementation Notes**:
        *   **Responsibilities**: Establish a server, manage client connections (with heartbeats), broadcast key system events (e.g., `task-added`, `cycle-start`), and accept incoming commands.
        *   **Integration**: `System` (for events/commands), `Config` (for port), `Messages` (to tap into the event stream).
        *   **Config**: `server.websocket.port: 8080`, `server.websocket.enabled: true`.
        *   **First Steps**: Add `ws` dependency. Create the basic server in `core/system/WebSocketServer.js`. Broadcast a "system-ready" message on startup.
*   **Component**: `Messages` Middleware
    *   **Status**: 🔲
    *   **Implementation Notes**:
        *   **Responsibilities**: Create a pipeline for intercepting, logging, and transforming messages between components.
        *   **Integration**: `System` and all core components that emit or receive messages.
        *   **First Steps**: Implement a simple array-based middleware pattern in `core/messaging/Middleware.js`. Add a basic logging middleware as the first use case.
*   **Component**: `BootstrapSystem`
    *   **Status**: 🔲
    *   **Implementation Notes**:
        *   **Responsibilities**: Read a designated plan file (e.g., `NEXT.complete.md`), use `PlanProcessor` to parse it into a goal tree, and dispatch the highest-priority goals to the `System`.
        *   **Integration**: `PlanProcessor` (to parse), `System` (to dispatch goals), `FileSystem` tools (to read the plan).
        *   **Config**: `system.bootstrap.plan_file: 'NEXT.complete.md'`.
        *   **First Steps**: Create `core/analysis/BootstrapSystem.js`. Implement the logic to read the file and log the top-level goals it finds.

### **Phase 3: The Path to Metacognition (💧 MID-TERM PRIORITY)**
*   **Component**: `PatternDetector`
    *   **Status**: 🔲
    *   **Implementation Notes**:
        *   **Responsibilities**: Analyze streams of tasks and events to identify temporal, causal, and hierarchical patterns.
        *   **Integration**: `Memory` (to get event history), `System` (to report discovered patterns as new beliefs).
        *   **First Steps**: Implement a simple temporal pattern detector (e.g., "If A happens, then B tends to happen within 5 cycles").
*   **Component**: `ContradictionAnalyzer` & `ResolutionStrategy`
    *   **Status**: 🔲
    *   **Implementation Notes**:
        *   **Responsibilities**: `Analyzer` detects logical conflicts (e.g., A and not-A). `Strategy` implements methods to resolve them (e.g., question evidence, seek more info).
        *   **Integration**: `Reasoner` (to check new conclusions), `Memory` (to scan for existing beliefs).
        *   **First Steps**: Implement the simplest contradiction: detecting a direct negation `(A. {1.0})` and `(A. {0.0})`.
*   **Component**: `StrategyRegistry` & `SystemContext`
    *   **Status**: 🔲
    *   **Implementation Notes**:
        *   **Responsibilities**: `Registry` allows for dynamic registration and selection of reasoning strategies. `Context` provides safe, read-only access to system internals for those strategies.
        *   **Integration**: `Reasoner` (to select a strategy), all core components (via `SystemContext`).
        *   **First Steps**: Refactor the existing `Reasoner` to pull its logic from a default strategy registered in a new `StrategyRegistry`.

### **Phase 4: Architectural Refinement & Tooling (❄️ DEFERRED)**
*   **Component**: `DIContainer`, `CommandBus`, `EventListenerManager`
    *   **Status**: 🔲
    *   **Notes**: These are architectural patterns to be applied across the codebase to improve modularity, decoupling, and testability as the system grows.
*   **Component**: `UnitTestAnalyzer`
    *   **Status**: 🔲
    *   **Notes**: A high-leverage tool for self-improvement. It would ingest test failure logs, use the `LM` to hypothesize the cause, and suggest code changes.
*   **Component**: AI-Powered Metaprogramming Tools
    *   **Status**: 🔲
    *   **Notes**: A suite of tools (`create-component`, `document-api`) that use the `LM` and file system access to automate common development tasks.

### **Phase 5: Knowledge & Expansion (🔮 FUTURE)**
*   **Component**: Knowledge Base Integration
    *   **Status**: 🔲
    *   **Notes**: Develop parsers and integrators for external knowledge bases like **SUMO, WordNet, and Wikidata**. This will provide the system with a vast corpus of foundational world knowledge.
*   **Component**: Advanced System Services
    *   **Status**: 🔲
    *   **Notes**: Includes `ResourceAllocator` for managing external tool costs and `MetricsService` for deep, centralized system observability.