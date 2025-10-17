import {Truth} from '../Truth.js';

export const TruthFunctions = (() => {
    // Common utilities
    const validateInputs = (t1, t2) => t1 && t2;
    const validateInput = (t) => t;
    const combineConfidence = (c1, c2) => Math.min(c1, c2);
    const averageFrequency = (f1, f2) => (f1 + f2) / 2;

    // Higher-order function to eliminate repetitive validation
    const withValidation = (fn) => (...args) => {
        if (args.length === 2 && !validateInputs(args[0], args[1])) return null;
        if (args.length === 1 && !validateInput(args[0])) return null;
        return fn(...args);
    };

    return {
        // Basic NAL truth value operations - optimized and consolidated

        revision: withValidation((t1, t2) => {
            const { f: f1, c: c1 } = t1, { f: f2, c: c2 } = t2;
            const f = (f1 * c1 + f2 * c2) / (c1 + c2);
            return new Truth(f, Math.min(1.0, c1 + c2));
        }),

        deduction: withValidation((t1, t2) => {
            const { f: f1, c: c1 } = t1, { f: f2, c: c2 } = t2;
            return new Truth(f1 * f2, c1 * c2);
        }),

        induction: withValidation((t1, t2) => {
            const { f: f1, c: c1 } = t1, { f: f2, c: c2 } = t2;
            const denominator = 1 - f1 * f2;
            if (denominator === 0) return new Truth(0.5, combineConfidence(c1, c2));

            const f = (f1 * (1 - f2) + f2 * (1 - f1)) / denominator;
            return new Truth(f, combineConfidence(c1, c2));
        }),

        abduction: withValidation((t1, t2) => {
            const { f: f1, c: c1 } = t1, { f: f2, c: c2 } = t2;
            const denominator = f1 * f2 + (1 - f1) * (1 - f2);
            if (denominator === 0) return new Truth(0.5, combineConfidence(c1, c2));

            return new Truth((f1 * f2) / denominator, combineConfidence(c1, c2));
        }),

        exemplification: withValidation((t1, t2) => {
            const { f: f1, c: c1 } = t1, { f: f2, c: c2 } = t2;
            return new Truth(averageFrequency(f1, f2), combineConfidence(c1, c2));
        }),

        comparison: withValidation((t1, t2) => {
            const { f: f1, c: c1 } = t1, { f: f2, c: c2 } = t2;
            const denominator = f1 * f2 + (1 - f1) * (1 - f2);
            if (denominator === 0) return new Truth(0.5, combineConfidence(c1, c2));

            return new Truth((f1 * f2) / denominator, combineConfidence(c1, c2));
        }),

        negation: withValidation((truth) => new Truth(1 - truth.f, truth.c)),

        contraposition: withValidation((t1, t2) => {
            const { f: f1, c: c1 } = t1, { f: f2, c: c2 } = t2;
            const denominator = f2 * (1 - f1) + (1 - f2) * f1;
            if (denominator === 0) return new Truth(0.5, combineConfidence(c1, c2));

            const f = f2 * (1 - f1) / denominator;
            return new Truth(f, combineConfidence(c1, c2));
        }),

        analogy: withValidation((t1, t2) => {
            const { f: f1, c: c1 } = t1, { f: f2, c: c2 } = t2;
            const denominator = f1 * f2 + (1 - f1) * (1 - f2);
            if (denominator === 0) return new Truth(0.5, combineConfidence(c1, c2));

            return new Truth((f1 * f2) / denominator, combineConfidence(c1, c2));
        }),

        resemblance: withValidation((t1, t2) => {
            const { f: f1, c: c1 } = t1, { f: f2, c: c2 } = t2;
            return new Truth(averageFrequency(f1, f2), combineConfidence(c1, c2));
        }),

        expectation(truth) { return truth ? truth.f * truth.c : 0; },
        isEqual(t1, t2) { return t1 && t2 && t1.f === t2.f && t1.c === t2.c; },
        isMoreConfident(t1, t2) { return t1 && t2 && t1.c > t2.c; },
        isStronger(t1, t2) { return this.expectation(t1) > this.expectation(t2); }
    };
})();