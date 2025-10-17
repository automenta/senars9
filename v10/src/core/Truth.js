import {TRUTH} from './config/constants.js';

export class Truth {
    constructor(f = TRUTH.DEFAULT_FREQUENCY, c = TRUTH.DEFAULT_CONFIDENCE) {
        this._f = f;
        this._c = c;
        Object.freeze(this);
    }

    get f() { return this._f; }
    get c() { return this._c; }

    // Static methods for truth value operations
    static deduction(t1, t2) {
        if (!t1 || !t2) return null;
        const f = t1.f * t2.f;
        const c = t1.c * t2.c;
        return new Truth(f, c);
    }

    static induction(t1, t2) {
        if (!t1 || !t2) return null;
        const f = t1.f;
        const c = Truth._weak(t1.c * t2.c) * t2.f;
        return new Truth(f, c);
    }

    static abduction(t1, t2) {
        if (!t1 || !t2) return null;
        const f = t2.f;
        const c = Truth._weak(t1.c * t2.c) * t1.f;
        return new Truth(f, c);
    }

    static detachment(t1, t2) {
        if (!t1 || !t2) return null;
        const f = t2.f;
        const c = (t1.c * t2.c) * t1.f;
        return new Truth(f, c);
    }

    static revision(t1, t2) {
        if (!t1 || !t2) return t1 || t2;
        const {f: f1, c: c1} = t1, {f: f2, c: c2} = t2;
        const f = (f1 * c1 + f2 * c2) / (c1 + c2);
        return new Truth(f, Math.min(1.0, c1 + c2));
    }

    static negation(truth) {
        if (!truth) return null;
        return new Truth(1 - truth.f, truth.c);
    }

    static expectation(truth) {
        return truth ? truth.f * truth.c : 0;
    }

    static _weak(c) {
        return c / (c + 1.0);
    }

    equals(other) {
        return other instanceof Truth && 
               Math.abs(this.f - other.f) < 1e-10 && 
               Math.abs(this.c - other.c) < 1e-10;
    }

    toString() {
        return `%${this.f.toFixed(2)};${this.c.toFixed(2)}%`;
    }
}