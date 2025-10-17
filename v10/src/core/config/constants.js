export const MEMORY_CONFIG = {
    SCORING_WEIGHTS: {activation: 0.5, useCount: 0.3, taskCount: 0.2},
    NORMALIZATION_LIMITS: {useCount: 100, taskCount: 50},
    CONSOLIDATION_THRESHOLDS: {
        activationThreshold: 0.1,
        minTasksThreshold: 5,
        decayThreshold: 0.01,
        minTasksForDecay: 2
    },
    ACTIVATION_MULTIPLIERS: {globalDecay: 0.9, averagePriority: 0.5}
};

export const CONCEPT_CONFIG = {
    DEFAULTS: {
        maxBeliefs: 100,
        maxGoals: 50,
        maxQuestions: 20,
        defaultDecayRate: 0.01,
        defaultActivationBoost: 0.1,
        maxActivation: 1.0,
        minQuality: 0,
        maxQuality: 1
    }
};

export const TASK_CONFIG = {
    DEFAULTS: {
        priority: 0.5,
        budget: 1.0,
        minPriority: 0,
        maxPriority: 1
    }
};

export const TERM_TYPES = {
    ATOM: 'atom',
    COMPOUND: 'compound'
};

export const TASK_TYPES = {
    BELIEF: 'BELIEF',
    GOAL: 'GOAL',
    QUESTION: 'QUESTION'
};

export const STAMP_SOURCES = {
    INPUT: 'INPUT',
    DERIVED: 'DERIVED',
    INFERENCE: 'INFERENCE'
};