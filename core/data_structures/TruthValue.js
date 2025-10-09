// TruthValue class - represents the truth value of a belief, consisting of frequency and confidence
export class TruthValue {
  constructor(frequency = 0.0, confidence = 0.0) {
    this.frequency = Math.max(0.0, Math.min(1.0, frequency)); // Clamp between 0 and 1
    this.confidence = Math.max(0.0, Math.min(1.0, confidence)); // Clamp between 0 and 1
  }

  // Override toString for Narsese representation
  toString() {
    return `%${this.frequency};${this.confidence}%`;
  }

  // Override valueOf and toJSON for proper serialization
  valueOf() {
    return this.toString();
  }

  toJSON() {
    return {
      frequency: this.frequency,
      confidence: this.confidence
    };
  }

  // Check equality with another TruthValue
  equals(other) {
    if (!(other instanceof TruthValue)) return false;
    // Use a small epsilon for floating point comparison
    const epsilon = 1e-10;
    return Math.abs(this.frequency - other.frequency) < epsilon &&
           Math.abs(this.confidence - other.confidence) < epsilon;
  }

  // Helper function for weakening confidence
  static weak(c) {
    return c / (c + 1.0);
  }

  // Calculates the truth-value of a conclusion derived from two premises through deduction
  // P1: M --> P <f1, c1>
  // P2: S --> M <f2, c2>
  // C: S --> P <F, C>
  // F = f1 * f2
  // C = f1 * f2 * c1 * c2
  static deduction(t1, t2) {
    const f = t1.frequency * t2.frequency;
    const c = t1.frequency * t2.frequency * t1.confidence * t2.confidence;
    return new TruthValue(f, c);
  }

  // Calculates the truth-value for an inductive conclusion
  // P1: M --> S <f1, c1>
  // P2: M --> P <f2, c2>
  // C: S --> P <F, C>
  // F = f1
  // C = weak(c1 * c2) * f2
  static induction(t1, t2) {
    const f = t1.frequency;
    const c = TruthValue.weak(t1.confidence * t2.confidence) * t2.frequency;
    return new TruthValue(f, c);
  }

  // Calculates the truth-value for an abductive conclusion
  // P1: S --> M <f1, c1>
  // P2: P --> M <f2, c2>
  // C: S --> P <F, C>
  // F = f2
  // C = weak(c1 * c2) * f1
  static abduction(t1, t2) {
    const f = t2.frequency;
    const c = TruthValue.weak(t1.confidence * t2.confidence) * t1.frequency;
    return new TruthValue(f, c);
  }

  // Calculates the truth-value for a detachment (Modus Ponens) conclusion
  // P1: X <f1, c1>
  // P2: X ==> Y <f2, c2>
  // C: Y <F, C>
  // F = f2
  // C = (c1 * c2) * f1
  static detachment(t1, t2) {
    const f = t2.frequency;
    const c = (t1.confidence * t2.confidence) * t1.frequency;
    return new TruthValue(f, c);
  }
}