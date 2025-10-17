export class Truth {
    constructor(f, c) {
        this._f = f;
        this._c = c;
        Object.freeze(this);
    }

    get f() {
        return this._f;
    }

    get c() {
        return this._c;
    }

    // Static methods for truth value operations
    static deduction(t1, t2) {
        const f = t1.f * t2.f;
        const c = t1.f * t2.f * t1.c * t2.c;
        return new Truth(f, c);
    }

    static induction(t1, t2) {
        const f = t1.f;
        const c = Truth._weak(t1.c * t2.c) * t2.f;
        return new Truth(f, c);
    }

    static abduction(t1, t2) {
        const f = t2.f;
        const c = Truth._weak(t1.c * t2.c) * t1.f;
        return new Truth(f, c);
    }

    static detachment(t1, t2) {
        const f = t2.f;
        const c = (t1.c * t2.c) * t1.f;
        return new Truth(f, c);
    }

    static _weak(c) {
        return c / (c + 1.0);
    }

    equals(other) {
        return other instanceof Truth && this.f === other.f && this.c === other.c;
    }

    toString() {
        return `%${this.f.toFixed(2)};${this.c.toFixed(2)}%`;
    }
}