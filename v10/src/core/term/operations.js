import {Truth} from '../Truth.js';
import {TRUTH} from '../config/constants.js';

export const TruthFunctions = {
    // Common utilities - consolidated and parameterized
    validateInputs: (t1, t2) => t1 && t2,
    validateInput: (t) => t,
    combineConfidence: (c1, c2) => Math.min(c1, c2),
    averageFrequency: (f1, f2) => (f1 + f2) / 2,
    safeDivide: (numerator, denominator) => denominator === 0 ? TRUTH.DEFAULT_FREQUENCY : numerator / denominator,

    // NAL truth value functions
    revision: (t1, t2) => {
        if (!t1 || !t2) return t1 || t2;
        const {f: f1, c: c1} = t1, {f: f2, c: c2} = t2;
        const f = (f1 * c1 + f2 * c2) / (c1 + c2);
        return new Truth(f, Math.min(1.0, c1 + c2));
    },

    deduction: (t1, t2) => {
        if (!t1 || !t2) return null;
        const f = t1.f * t2.f;
        const c = t1.c * t2.c;
        return new Truth(f, c);
    },

    induction: (t1, t2) => {
        if (!t1 || !t2) return null;
        const f = t1.f;
        const c = TruthFunctions._weak(t1.c * t2.c) * t2.f;
        return new Truth(f, c);
    },

    abduction: (t1, t2) => {
        if (!t1 || !t2) return null;
        const f = t2.f;
        const c = TruthFunctions._weak(t1.c * t2.c) * t1.f;
        return new Truth(f, c);
    },

    exemplification: (t1, t2) => {
        if (!t1 || !t2) return null;
        return new Truth(TruthFunctions.averageFrequency(t1.f, t2.f), TruthFunctions.combineConfidence(t1.c, t2.c));
    },

    comparison: (t1, t2) => {
        if (!t1 || !t2) return null;
        const {f: f1, c: c1} = t1, {f: f2, c: c2} = t2;
        const denominator = f1 * f2 + (1 - f1) * (1 - f2);
        return new Truth(TruthFunctions.safeDivide(f1 * f2, denominator), TruthFunctions.combineConfidence(c1, c2));
    },

    negation: (truth) => {
        if (!truth) return null;
        return new Truth(1 - truth.f, truth.c);
    },

    contraposition: (t1, t2) => {
        if (!t1 || !t2) return null;
        const {f: f1, c: c1} = t1, {f: f2, c: c2} = t2;
        const denominator = f2 * (1 - f1) + (1 - f2) * f1;
        const f = TruthFunctions.safeDivide(f2 * (1 - f1), denominator);
        return new Truth(f, TruthFunctions.combineConfidence(c1, c2));
    },

    analogy: (t1, t2) => {
        if (!t1 || !t2) return null;
        const {f: f1, c: c1} = t1, {f: f2, c: c2} = t2;
        const denominator = f1 * f2 + (1 - f1) * (1 - f2);
        return new Truth(TruthFunctions.safeDivide(f1 * f2, denominator), TruthFunctions.combineConfidence(c1, c2));
    },

    resemblance: (t1, t2) => {
        if (!t1 || !t2) return null;
        return new Truth(TruthFunctions.averageFrequency(t1.f, t2.f), TruthFunctions.combineConfidence(t1.c, t2.c));
    },

    expectation: (truth) => truth ? truth.f * truth.c : 0,
    isEqual: (t1, t2) => t1 && t2 && Math.abs(t1.f - t2.f) < 1e-10 && Math.abs(t1.c - t2.c) < 1e-10,
    isMoreConfident: (t1, t2) => t1 && t2 && t1.c > t2.c,
    isStronger: (t1, t2) => TruthFunctions.expectation(t1) > TruthFunctions.expectation(t2),

    _weak: (c) => c / (c + 1.0)
};