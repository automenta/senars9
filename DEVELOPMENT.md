# SeNARS Development Guide

This document contains all developer-focused information, including setup, workflow, and coding standards.

## Code Guidelines

- **Elegant**: Clean, beautiful solutions that solve complex problems simply
- **Consolidated**: Minimize concepts, maximize utility
- **Consistent**: Uniform patterns throughout the codebase
- **Organized**: Clear structure and logical arrangement
- **Deeply deduplicated**: DRY principle applied rigorously
- **Abstract**: High-level interfaces with flexible implementations
- **Modularized**: Independent, composable components
- **Parameterized**: Configurable behavior through parameters
- **Terse syntax**: Concise, expressive code patterns
- **Professional**: Production-ready, maintainable code

## Implementation Strategy

### Phase 1: Foundation

1. **Core Infrastructure**
   - Implement Core class with metaprogramming
   - Create Config system with caching
   - Build Messages system with middleware
   - Develop Rules engine with winnowing

2. **Component Framework**
   - Implement Component base class
   - Create standardized interfaces
   - Add lifecycle management
   - Implement error handling patterns

### Phase 2: Core Components

1. **Essential Components**
   - Build Memory component with caching
   - Implement Reasoning component with core integration
   - Create Cycle component with adaptive timing
   - Develop Self component for optimization

2. **Intelligence Integration**
   - Implement LM component with multi-provider support
   - Build Tools with comprehensive automation
   - Add embedding generation and processing
   - Create hypothesis generation capabilities

### Phase 3: Advanced Features

1. **Plugin System**
   - Implement Plugins component
   - Add hot reloading capability
   - Create plugin registry
   - Add metadata management

2. **Factory and System Integration**
   - Create Core factory function
   - Build System class wrapper
   - Add compatibility layers
   - Implement comprehensive API

## Testing Strategy Specification

### Test Categories and Coverage Requirements

| Test Category | Description | Coverage Target | Automation Level |
|---------------|-------------|-----------------|------------------|
| **Unit Tests** | Individual component testing | > 95% | Fully automated |
| **Integration Tests** | Component interaction testing | > 90% | Automated with manual verification |
| **Cognitive Tests** | Reasoning and inference validation | > 85% | Semi-automated with golden datasets |
| **Performance Tests** | Load and timing validation | > 80% | Automated benchmarking |
| **Resilience Tests** | Error handling and recovery | > 90% | Automated fault injection |
| **End-to-End Tests** | Complete workflow validation | > 75% | Manual with automated setup |

### Test Data Management

```typescript
interface TestScenario {
  name: string;
  description: string;
  setup: TestSetup[];
  inputs: TestInput[];
  expectedOutputs: TestExpectation[];
  assertions: TestAssertion[];
  cleanup: TestCleanup[];
}

interface TestInput {
  type: 'task' | 'event' | 'query' | 'command';
  data: any;
  timing?: number;  // Relative timing in ms
}

interface TestExpectation {
  type: 'task_derived' | 'error' | 'state_change' | 'output';
  condition: string;  // Description of expected condition
  tolerance?: number; // Acceptable variance
}
```

## Deployment and Operations Specification

### Container Strategy
```typescript
interface DeploymentConfig {
  // Container configuration
  baseImage: string;
  workingDirectory: string;
  port: number;
  environment: { [key: string]: string };

  // Resource limits
  cpuLimit: string;      // Kubernetes CPU units
  memoryLimit: string;   // Memory limit
  storageRequest: string; // Storage request

  // Health checks
  healthCheck: {
    endpoint: string;
    initialDelay: number;
    period: number;
    timeout: number;
    failureThreshold: number;
  };

  // Scaling configuration
  scaling: {
    minReplicas: number;
    maxReplicas: number;
    targetCpuUtilization: number;
    targetMemoryUtilization: number;
  };
}
```

### Monitoring and Observability
```typescript
interface MonitoringConfig {
  // Metrics collection
  metrics: {
    enabled: boolean;
    interval: number;      // Collection interval in seconds
    retention: number;     // Retention period in days
    exporters: string[];   // Prometheus, Jaeger, etc.
  };

  // Logging configuration
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    destination: 'stdout' | 'file' | 'remote';
    rotation: {
      maxSize: string;     // Max log file size
      maxFiles: number;    // Max number of files to keep
    };
  };

  // Tracing configuration
  tracing: {
    enabled: boolean;
    serviceName: string;
    endpoint: string;
    samplingRate: number;  // 0.0 to 1.0
  };

  // Alerting configuration
  alerting: {
    enabled: boolean;
    rules: AlertRule[];
    notificationChannels: string[];
  };
}
```

## Development Workflow

### Project Structure

```
v2/
├── core/                 # Core implementation
│   ├── Core.js          # Main orchestrator
│   ├── Config.js        # Configuration system
│   ├── Messages.js      # Unified messaging
│   ├── Rules.js         # Rule engine
│   ├── Component.js     # Base component class
│   ├── Memory.js        # Memory management
│   ├── Reasoning.js     # Reasoning strategies
│   ├── Cycle.js         # Cognitive cycling
│   ├── LM.js           # Language model integration
│   ├── Tools.js   # Tool execution framework
│   ├── Plugins.js       # Plugin system
│   ├── Self.js         # Self-optimization
│   ├── createCore.js   # Factory function
│   ├── System.js       # System wrapper
│   └── index.js        # Public API
├── tests/              # Comprehensive tests
│   ├── unit/          # Unit tests
│   ├── integration/   # Integration tests
│   └── performance/   # Performance tests
├── docs/              # Documentation
│   ├── api/          # API reference
│   ├── guides/       # User guides
│   └── examples/     # Code examples
└── examples/          # Usage examples
    ├── basic/        # Basic usage
    ├── llm/         # Language model examples
    ├── tools/       # Tool execution examples
    └── plugins/     # Plugin development
```

### Development Commands

```bash
# Core development
npm run dev:core        # Start core development
npm run test:core       # Run core tests
npm run test:watch      # Watch mode testing

# Full system
npm run dev             # Start complete system
npm run test            # Run all tests
npm run lint            # Code quality checks

# Documentation
npm run docs:build      # Build documentation
npm run docs:serve      # Serve documentation locally
```

## Performance Characteristics

### Optimizations
- **Rule Winnowing**: 60-80% reduction in compiled rule evaluation overhead
- **Intelligent Caching**: Multi-level caching with predictive prefetching
- **Adaptive Timing**: Dynamic cycle intervals based on system load
- **Memory Efficiency**: Optimized data structures and garbage collection
- **LLM Optimization**: Provider fallbacks and pipeline reuse
- **Tool Execution**: Timeout handling and concurrent execution

### Benchmarks
- **Rule Evaluation**: < 1ms for typical rule sets
- **Memory Access**: < 100μs for cached queries
- **Cycle Time**: Adaptive 50-200ms based on system load
- **LLM Response**: < 2s for typical generation tasks
- **Tool Execution**: < 5s for typical automation tasks
- **Plugin Loading**: < 10ms for hot reloading

## Success Metrics

### Performance Goals
- **90% reduction** in architectural complexity
- **50% improvement** in rule evaluation performance
- **80% reduction** in memory allocation overhead
- **Zero-downtime** plugin loading and unloading
- **Sub-2-second** LLM response times
- **Sub-5-second** tool execution times

### Quality Goals
- **100% test coverage** for core components
- **< 1% performance regression** vs. v1
- **Zero breaking changes** during migration
- **Complete compatibility** with existing tooling
- **99.9% uptime** for production deployments

## Contributing

### Development Setup
```bash
git clone <repository>
cd senars/v2
npm install
npm run dev:setup
npm run test
```

### Code Standards
- **ES2022+** features with broad compatibility
- **TypeScript** for critical path components
- **Comprehensive JSDoc** documentation
- **Prettier** formatting with project-specific rules
- **ESLint** with custom rules for cognitive architecture patterns

## License

AGPL-3.0-or-later - See LICENSE file for details.

## Acknowledgments

SeNARS builds upon the foundational work of OpenNARS, ANSNA, OpenNARS for Applications, NARchy, while introducing significant architectural improvements for scalability, maintainability, and performance. The new architecture integrates advanced LLM capabilities, comprehensive tool execution, and sophisticated reasoning strategies into a unified, self-optimizing system.