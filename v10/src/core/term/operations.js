import {Truth} from '../Truth.js';

export const TruthFunctions = {
    // Basic NAL truth value operations

    revision(t1, t2) {
        if (!t1 || !t2) return null;

        const f = (t1.f * t1.c + t2.f * t2.c) / (t1.c + t2.c);
        const c = t1.c + t2.c;

        return new Truth(f, Math.min(1.0, c));
    },

    deduction(t1, t2) {
        if (!t1 || !t2) return null;

        const f = t1.f * t2.f;
        const c = t1.c * t2.c;

        return new Truth(f, c);
    },

    induction(t1, t2) {
        if (!t1 || !t2) return null;

        const f = (t1.f * (1 - t2.f) + t2.f * (1 - t1.f)) / (1 - t1.f * t2.f);
        const c = Math.min(t1.c, t2.c);

        return new Truth(f, c);
    },

    abduction(t1, t2) {
        if (!t1 || !t2) return null;

        const f = (t1.f * t2.f) / (t1.f * t2.f + (1 - t1.f) * (1 - t2.f));
        const c = Math.min(t1.c, t2.c);

        return new Truth(f, c);
    },

    exemplification(t1, t2) {
        if (!t1 || !t2) return null;

        const f = (t1.f + t2.f) / 2;
        const c = Math.min(t1.c, t2.c);

        return new Truth(f, c);
    },

    comparison(t1, t2) {
        if (!t1 || !t2) return null;

        const f = (t1.f * t2.f) / (t1.f * t2.f + (1 - t1.f) * (1 - t2.f));
        const c = Math.min(t1.c, t2.c);

        return new Truth(f, c);
    },

    negation(truth) {
        if (!truth) return null;

        return new Truth(1 - truth.f, truth.c);
    },

    contraposition(t1, t2) {
        if (!t1 || !t2) return null;

        const f = t2.f * (1 - t1.f) / (t2.f * (1 - t1.f) + (1 - t2.f) * t1.f);
        const c = Math.min(t1.c, t2.c);

        return new Truth(f, c);
    },

    analogy(t1, t2) {
        if (!t1 || !t2) return null;

        const f = (t1.f * t2.f) / (t1.f * t2.f + (1 - t1.f) * (1 - t2.f));
        const c = Math.min(t1.c, t2.c);

        return new Truth(f, c);
    },

    resemblance(t1, t2) {
        if (!t1 || !t2) return null;

        const f = (t1.f + t2.f) / 2;
        const c = Math.min(t1.c, t2.c);

        return new Truth(f, c);
    },

    expectation(truth) {
        if (!truth) return 0;

        return truth.f * truth.c;
    },

    isEqual(t1, t2) {
        return t1 && t2 && t1.f === t2.f && t1.c === t2.c;
    },

    isMoreConfident(t1, t2) {
        return t1 && t2 && t1.c > t2.c;
    },

    isStronger(t1, t2) {
        return this.expectation(t1) > this.expectation(t2);
    }
};