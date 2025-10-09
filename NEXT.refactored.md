# SeNARS Refactored Development Roadmap

**FOUNDATION FIRST**: This roadmap focuses on core cognitive architecture before advanced features, with LangChain.js integration targeted only at essential reasoning capabilities. All "bells-and-whistles" (PDF processing, REST APIs, web automation) are deferred until the core engine is solid and tested.

## Executive Summary

### Current Status
- ✅ **Rules Engine**: Complete with pre-filtering and indexing (60-80% performance improvement)
- ✅ **Memory System**: Complete with focus sets and basic query optimization  
- ✅ **LM Component**: Complete with modular architecture and provider abstraction
- ✅ **Integration Tests**: Core component interaction validation complete
- ✅ **Examples**: 2-3 basic usage demonstrations complete

### Active Development Priorities
1. **WebSocket Server**: Real-time GUI and inter-NARS communication
2. **Reasoning Component**: Simple inference rule application
3. **Messages System**: Middleware and error handling
4. **System Wrapper**: Basic API for core operations
5. **Planning & Graph Systems**: Goal decomposition and knowledge representation

### Next Phase Priorities
1. **BagAdjacencyCollection**: Priority-based graph structure implementation
2. **Graph Traversal**: Algorithms for knowledge discovery
3. **HTN Planning**: Goal decomposition into subtasks
4. **A* Planning**: Optimal pathfinding for action sequences
5. **Plan Execution**: Basic execution and monitoring

## Core Architecture Roadmap

### Priority 1: Essential Foundation
- [ ] **WebSocket Server**: Real-time GUI and inter-NARS communication
- [ ] **Basic Reasoning Component**: Apply rules to tasks and generate new tasks
- [ ] **Messages System**: Middleware and error handling implementation
- [ ] **System Wrapper**: Essential API for core operations

### Priority 2: System Integration & Enhancement
- [ ] **Planning & Graph Systems Integration**
- [ ] **Advanced LM Integration** (Narsese I/O, workflows)
- [ ] **Cognitive Validation Tests**
- [ ] **Getting Started Guide**

### Priority 3: Advanced Capabilities
- [ ] **A* Planning Implementation**
- [ ] **Plan Execution & Monitoring**
- [ ] **Advanced Analysis & Diagnostics**
- [ ] **Temporal Reasoning Systems**

## Component Dependencies & Integration

### High-Leverage Components
1. **LM Component** - Enables Narsese processing, plan extraction, and graph embeddings
2. **WebSocket Server** - Enables GUI, monitoring, and inter-NARS communication
3. **BagAdjacencyCollection** - Enables both graph reasoning and planning algorithms
4. **Basic Reasoning** - Validates all other components' outputs and functionality

### Component Integration Points
- LM Component provides Narsese conversion for all input/output operations
- WebSocket Server enables real-time monitoring of all system components
- Graph systems support both planning algorithms and semantic reasoning
- Memory focus sets optimize performance across all data-intensive operations

## Actionable Next Steps

### Immediate Actions (Week 1)
1. Complete WebSocket Server implementation
2. Implement basic reasoning component with rule integration
3. Add messages system middleware pipeline

### Short-term Actions (Week 2-3)
1. Build basic System class with essential API
2. Complete unified command/event processing
3. Add error handling and recovery to message system

### Medium-term Actions (Week 4+)
1. Implement BagAdjacencyCollection for knowledge graphs
2. Create HTN planning for goal decomposition
3. Add plan processing for document-based goal extraction

## Success Metrics

### Functional Validation
- [ ] System initializes and runs basic cognitive cycle
- [ ] Can add and retrieve tasks from memory
- [ ] Can apply rules to generate new tasks from existing ones
- [ ] WebSocket server enables real-time GUI connections
- [ ] Can represent knowledge as graphs and traverse with priority sampling

### Performance Validation
- [ ] Memory queries return in < 10ms
- [ ] Rule lookup time < 1ms for typical rule sets
- [ ] Rule pre-filtering reduces rule count by 60%+
- [ ] System can handle continuous cognitive cycles with proper timing

## Integration Priorities for Maximum Impact

### Highest Leverage Actions
1. **WebSocket Server** - Enables external interaction and system monitoring
2. **Basic Reasoning Component** - Core functionality that validates all other components
3. **Message System Middleware** - Communication infrastructure for all components
4. **System API Wrapper** - User interface to the entire cognitive system

These components form the foundation upon which all other functionality depends.