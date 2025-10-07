# SeNARS Language-Agnostic Specification

This document provides the complete language-agnostic specification for SeNARS. It defines the core data structures, terminology, and constants that form the foundation of the system.

## Task Punctuation Types

| Punctuation | Name     | Description                                                 | Example Usage                            |
|-------------|----------|-------------------------------------------------------------|------------------------------------------|
| `.`         | **Belief**   | Represents a statement about the world with associated truth value. | `(cat --> mammal).` - "Cats are mammals" |
| `!`         | **Goal**     | Represents a desired state the system aims to achieve.      | `clean_kitchen!` - "Clean the kitchen"   |
| `?`         | **Question** | Represents an information query seeking specific knowledge. | `cat_purr_frequency?` - "How often do cats purr?" |

## Term Operator Types

### Core Relationship Operators

| Operator                | Syntax                      | Description                                        | Example                                           | Cognitive Purpose                          |
|-------------------------|-----------------------------|----------------------------------------------------|---------------------------------------------------|--------------------------------------------|
| **Negation**            | `(--, term)`                | Logical NOT                                        | `(--, (cat --> bird))`, shorthand: `--x`           | Contradiction and negation handling        |
| **Product**             | `(x,y)`                     | Tuples/vectors/lists                               | `(x,y)`                                           | Ordered data relation                      |
| **Inheritance**         | `(subject --> predicate)`   | "is-a" relationships and hierarchical knowledge    | `(cat --> mammal)`                                | Taxonomic classification and inheritance reasoning |
| **Similarity**          | `(term1 <-> term2)`         | Similarity relationships                           | `(dog <-> wolf)`                                  | Analogical reasoning and pattern matching  |
| **Implication**         | `(premise ==> conclusion)`  | Predictive or causal links                         | `(raining ==> wet_streets)`                       | Forward causal and predictive reasoning    |
| **Equivalence**         | `(term1 <=> term2)`         | Bidirectional relationships                        | `(cat <=> feline)`                                | Symmetric relationship representation      |
| **Conjunction**         | `(&, term1, term2, ...)`    | Logical AND combination                            | `(&, cat, furry, pet)`, infix form: `(a & b)`==`(&,a,b)` (same for `|`) | Complex condition representation         |
| **Disjunction**         | `(|, term1, term2, ...)`    | Logical OR alternatives                            | `(|, cat, dog, bird)`                             | Alternative possibility representation     |
| **Sequential Conjunction** | `(&/, action, condition)`   | Conditional operations                             | `(&/, clean, dirty_room)`                         | Action planning with preconditions         |
| **Operation**           | `(function ^ arguments)`    | Operations, function call                          | alternate C-like syntax: `f(x,y)`=`(f ^ (x,y))`      | Mental/physical actions                    |

### Set and Property Operators

| Operator          | Syntax                  | Description               | Example                  | Cognitive Purpose                      |
|-------------------|-------------------------|---------------------------|--------------------------|----------------------------------------|
| **Instance**      | `(instance {-- class)`   | Specific instances        | `(fluffy {-- cat)`        | Individual-class relationships         |
| **Property**      | `(object --} property)` | Attribute relationships   | `(cat --} furry)`         | Property and characteristic modeling   |
| **Extensional Set** | `{item1, item2, ...}`   | Set membership            | `{cat, dog, bird}`       | Collection and membership representation |
| **Intensional Set** | `[property1, property2]`| Property-based sets       | `[furry, pet, mammal]`   | Abstract set definition                |

## System Constants Specification

### Truth Value Ranges

| Level        | Frequency | Confidence | Description                        |
|--------------|-----------|------------|------------------------------------|
| **High**     | 1.0       | 0.9        | Strong belief with high certainty  |
| **Medium-High**| 0.9       | 0.85       | Strong belief with good certainty  |
| **Medium**     | 0.8       | 0.85       | Moderate belief with good certainty|
| **Medium-Low** | 0.7       | 0.8        | Moderate belief with moderate certainty|
| **Low**        | 0.5       | 0.7        | Weak belief with moderate certainty|
| **Very Low**   | 0.1       | 0.2        | Speculative belief with low certainty |

### Priority Levels

| Level       | Value | Description               | Use Case                  |
|-------------|-------|---------------------------|---------------------------|
| **Default**   | 0.0   | No special priority       | Background processing     |
| **Low**       | 0.1   | Minimal priority boost    | Non-urgent tasks          |
| **Medium**    | 0.5   | Standard priority         | Regular cognitive work    |
| **High**      | 0.8   | Elevated priority         | Important goals/questions |
| **Very High** | 0.95  | Maximum priority          | Critical system tasks     |

### Time Thresholds

| Threshold             | Duration | Description                  |
|-----------------------|----------|------------------------------|
| **Default Expiration**  | 24 hours | Standard task lifetime       |
| **Long Expiration**     | 30 days  | Extended task persistence    |
| **High Importance**     | 0.8      | Priority threshold for focus |
| **Very High Importance**| 0.95     | Critical task threshold      |

## Core Data Structures

These interfaces are defined in a language-agnostic way.

### Term Structure

```typescript
interface Term {
  // Core properties
  readonly name: string;
  readonly type: TermType;
  readonly complexity: number;

  // Structural components for compound terms
  readonly subject?: Term;
  readonly predicate?: Term;
  readonly components?: Term[];

  // Semantic grounding
  readonly embedding?: number[];

  // Metadata
  readonly createdAt: number;
  readonly hash: string;
}
```

### Task Structure

```typescript
interface TruthValue {
  frequency: number;    // 0.0 to 1.0, evidential support
  confidence: number;   // 0.0 to 1.0, certainty measure
}

interface Task {
  // Core components
  readonly term: Term;
  readonly punctuation: Punctuation;
  readonly truth: TruthValue;

  // Dynamic state
  priority: number;     // 0.0 to 1.0, current importance
  accessedAt: number;   // Last access timestamp
  createdAt: number;    // Creation timestamp

  // Temporal properties
  occurrenceTime?: number;  // When the event occurred
  expirationTime?: number;  // When task becomes obsolete

  // Cognitive state
  isInFocusSet: boolean;
  derivationPath?: string[];  // Reasoning trace
}
```

### Memory Structure

```typescript
interface MemoryIndex {
  [key: string]: Set<string>;  // Efficient lookups
}

interface Memory {
  // Dual storage architecture
  shortTermTasks: Map<string, Task>;
  longTermTasks: Map<string, Task>;

  // Indexing for efficient retrieval
  implicationIndex: MemoryIndex;
  inheritanceIndex: MemoryIndex;
  temporalIndex: MemoryIndex;
  similarityIndex: MemoryIndex;

  // Statistics
  totalTasks: number;
  consolidationCount: number;
  lastConsolidation: number;
}
```