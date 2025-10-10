# NEXT.md - SeNARS Development Plan

## A Comprehensive Roadmap for a Self-Improving Cognitive Architecture

---

## Part 1: The Strategic Roadmap

### **Executive Summary**
This document outlines the streamlined development plan for SeNARS. It focuses on a **self-leveraging, self-improving cognitive architecture** with a pragmatic, fundamentals-first implementation plan. By systematically enabling the system to participate in its own development, we will achieve an exponential return on our efforts. This plan is focused and strategic, ensuring the most critical functionality is prioritized.

### **Architectural Principles**
1.  **Fundamentals First**: Prioritize the core cognitive loop and the components that enable self-reflection and self-modification.
2.  **Everything is a Goal**: Frame all development tasks as machine-readable goals that the system can parse, plan, and execute.
3.  **Metaprogramming & Self-Leverage**: Use the system's own intelligence (LM, planning) to generate code, tests, and documentation.
4.  **Declarative Planning**: Define *what* needs to be done in development plans, allowing the system's planners to determine *how*.
5.  **Leverage Existing Tools**: Where possible, use established libraries and frameworks to minimize development effort.
6.  **Incremental Implementation**: Break complex components into smaller, testable units to enable rapid progress.
7.  **Parameterized Abstractions**: Use structured parameter classes (like the `Answer` class) to manage complex query specifications and maintain clean APIs.
8.  **Flexible Selection & Aggregation**: Implement modular selection criteria and truth aggregation strategies to support diverse cognitive operations.

### **The Phased Path to Autonomy**

#### **Phase 1: Foundational Stability (CURRENT STATE)**
**Complete.** We have a stable and performant platform comprising the core components of a cognitive architecture. This provides the launchpad for our self-improvement strategy.

#### **Phase 2: Introspection & Bootstrapping (IMMEDIATE PRIORITY)**
**Goal**: To create the core self-development loop. This is the most critical phase.
1.  **Leverage Existing Tools (`WebSocketServer`)**: Implement using the `ws` library to create a real-time communication channel to monitor and interact with the system's internal state.
2.  **Incremental Self-Direction (`BootstrapSystem`)**: Implement a simplified core component that reads this development plan and converts its directives into cognitive goals. Start with basic goal parsing and expand functionality iteratively.
3.  **First Self-Development Goal**: The `BootstrapSystem`'s first task will be to orchestrate the implementation of the **`PatternDetector`**, proving the viability of the self-development loop.

#### **Phase 3: The Path to Metacognition (MID-TERM PRIORITY)**
**Goal**: With the core loop established, we enhance the system's ability to reason about its own state and knowledge, forming the basis of metacognition.
1.  **Focused Pattern Recognition (`PatternDetector`)**: The system implements its own pattern-detection capabilities, focusing initially on temporal patterns that provide immediate value.
2.  **Logical Consistency (`ContradictionAnalyzer`, `ResolutionStrategy`)**: The system learns to detect and resolve logical contradictions, starting with the most common contradiction types.
3.  **Dynamic Reasoning (`StrategyRegistry`, `SystemContext`)**: The system can dynamically select the best reasoning strategy for a given problem, beginning with basic strategy selection.

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
*   **Memory & Knowledge**: `Memory`, `Bag`, `AdjacencyBag`, `GraphTraversal`, `TaskTable`, `Answer`
*   **Planning**: `AStarPlanner`, `HTNPlanner`, `PlanProcessor`, `PlanExecutor`
*   **Language Model (LM)**: `LM`, `LangChainProvider`, `XenovaProvider`, `LMConfiguration`, `ModelSelector`, `NarseseTranslator`
*   **Analysis & Configuration**: `AnalysisEngine`, `DataIngor`, `ReportGenerator`, `Config`, `ConfigManager`
*   **Testing & Validation**: Comprehensive unit/integration tests and examples.

### **Enhanced Task Storage & Retrieval System (✅ IMPLEMENTED)**
*   **TaskTable**: Abstracted storage mechanism with capacity limits and modular compression strategies (LRU eviction)
*   **SelectionCriteria**: Flexible querying with time vs. confidence weighting, custom ranking functions, and "closest in time" functionality
*   **Answer Class**: NARchy-inspired parameter class for managing query results and specifying selection criteria
*   **Aggregation Functions**: Modular truth value combination strategies (average, weighted, most recent, strongest confidence)
*   **API**: Clean, fluent interface supporting both direct criteria and Answer-based queries
*   **Testing**: Comprehensive unit tests covering storage, retrieval, selection, aggregation, capacity management, and end-to-end functionality

### **Phase 2: Introspection & Bootstrapping (🔥 IMMEDIATE PRIORITY)**

*   **Component**: `WebSocketServer`
    *   **Status**: 🔲
    *   **Implementation Notes**:
        *   **Responsibilities**: Establish a server using the `ws` library, manage client connections (with heartbeats), broadcast key system events (e.g., `task-added`, `cycle-start`), and accept incoming commands.
        *   **Integration**: `System` (for events/commands), `Config` (for port), `Messages` (to tap into the event stream).
        *   **Dependencies**: `ws` for WebSocket functionality
        *   **Config**: `server.websocket.port: 8080`, `server.websocket.enabled: true`.
        *   **First Steps**: Add `ws` dependency. Create the basic server in `core/system/WebSocketServer.js`. Broadcast a "system-ready" message on startup.
        
*   **Component**: `Messages` Middleware
    *   **Status**: 🔲
    *   **Implementation Notes**:
        *   **Responsibilities**: Create a pipeline for intercepting, logging, and transforming messages between components.
        *   **Integration**: `System` and all core components that emit or receive messages.
        *   **Dependencies**: `winston` for enhanced logging capabilities
        *   **First Steps**: Implement a simple array-based middleware pattern in `core/messaging/Middleware.js`. Add a basic logging middleware as the first use case.

*   **Component**: `BootstrapSystem` (Simplified & Leveraged)
    *   **Status**: 🔲
    *   **Implementation Notes**:
        *   **Responsibilities**: Read a designated plan file (e.g., `NEXT.md`) using the LM for parsing, use `PlanProcessor` to convert goals into a simple goal tree, and dispatch the highest-priority goals to the `System`. Focus initially on parsing goals from Phase 2.
        *   **Integration**: `PlanProcessor` (to parse), `System` (to dispatch goals), `LM` (for plan parsing), `FileSystem` tools (to read the plan), `Config` (for plan file location).
        *   **Dependencies**: `chokidar` for file system monitoring to detect plan changes automatically
        *   **Config**: `system.bootstrap.plan_file: 'NEXT.md'`, `system.bootstrap.priority_level: 2` (process up to phase 2).
        *   **Leveraged Components**: Use the existing `LM` to parse and interpret the plan file, and `PlanProcessor` to convert to actionable goals.
        *   **First Steps**: Create `core/analysis/BootstrapSystem.js`. Implement basic file monitoring with chokidar and use LM to parse the first goal from this plan. Use PlanProcessor to convert to an actionable goal.

### **Phase 3: The Path to Metacognition (💧 MID-TERM PRIORITY)**

*   **Component**: `PatternDetector` (Focused & Leveraged Implementation)
    *   **Status**: 🔲
    *   **Implementation Notes**:
        *   **Responsibilities**: Analyze streams of tasks and events to identify simple temporal patterns initially, leveraging existing memory systems.
        *   **Integration**: `Memory` (to get event history), `System` (to report discovered patterns as new beliefs), `LM` (to help identify complex patterns).
        *   **Dependencies**: `lodash` for utility functions to process pattern data
        *   **High-Impact Focus**: Start with simple temporal pattern detection (e.g., "If A happens, then B tends to happen within 5 cycles").
        *   **Leveraged Components**: Use the existing `Memory` system to access historical event data and `LM` to identify complex patterns.
        *   **First Steps**: Implement a simple temporal pattern detector using data from `Memory`. Use LM to assist with pattern recognition.

*   **Component**: `ContradictionAnalyzer` & `ResolutionStrategy` (Focused & Leveraged Implementation)
    *   **Status**: 🔲
    *   **Implementation Notes**:
        *   **Responsibilities**: `Analyzer` manages logical conflicts, starting with the most common types. `Strategy` implements basic methods to resolve them.
        *   **Integration**: `Reasoner` (to check new conclusions), `Memory` (to scan for existing beliefs), `LM` (to suggest resolution strategies).
        *   **Dependencies**: `ajv` for schema validation of contradiction rules
        *   **High-Impact Focus**: Start with detecting the simplest contradiction: direct negation `(A. {1.0})` and `(A. {0.0})`.
        *   **Leveraged Components**: Use the existing `Memory` system to scan for contradictions and `LM` to suggest resolution strategies.
        *   **First Steps**: Implement detection for direct negations using `Memory` system. Use LM to suggest resolution strategies.

*   **Component**: `StrategyRegistry` & `SystemContext` (Incremental & Leveraged Implementation)
    *   **Status**: 🔲
    *   **Implementation Notes**:
        *   **Responsibilities**: `Registry` allows for dynamic registration and selection of reasoning strategies. `Context` provides safe, read-only access to system internals.
        *   **Integration**: `Reasoner` (to select a strategy), all core components (via `SystemContext`), `Config` (for strategy selection rules).
        *   **Leveraged Components**: Use existing `Reasoner` as a base, `Config` for strategy selection rules, and `LM` to generate new strategies dynamically.
        *   **First Steps**: Refactor the existing `Reasoner` to pull its logic from a default strategy registered in a new `StrategyRegistry`. Implement a basic `SystemContext` with limited access using existing system components.

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

---

## Development Methodology

### **Incremental Implementation Approach**
- Break complex components into smaller, testable units
- Implement and test each unit before moving to the next
- Use iterative development to build complexity gradually

### **Leverage Existing Tools**
- Use well-established libraries (e.g., `ws` for WebSockets, `chokidar` for file monitoring)
- Build on existing patterns within the codebase
- Avoid reinventing existing solutions
- Leverage the LM for parsing, analysis, and code generation

### **Focus on High-Impact Features**
- Prioritize features that directly enable self-development
- Implement the minimal viable functionality first
- Expand capabilities based on demonstrated value

This revised plan applies the requested improvements by simplifying complex components, leveraging existing tools (including system components like LM, Memory, PlanProcessor), implementing incrementally, and focusing on high-impact features. This approach should enable faster progress toward the self-improving cognitive architecture while maintaining quality and stability.
