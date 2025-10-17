import { Stamp, ArrayStamp } from '../Stamp.js';
import { Term } from '../term/Term.js';
import { Truth } from '../Truth.js';

export class Task {
 constructor({ term, type, truth = null, stamp = null, priority = 0.5, budget = 1.0, accessedAt = null }) {
   if (!(term instanceof Term)) {
     throw new Error('Task must be initialized with a valid Term object.');
   }

   this._term = term;
   this._type = type;
   this._truth = truth;
   this._stamp = stamp || Stamp.createInput();
   this._priority = Math.max(0, Math.min(1, priority));
   this._budget = budget;
   this._createdAt = this._stamp.occurrenceTime;
   this._accessedAt = accessedAt || this._createdAt;
   Object.freeze(this);
 }

 static get DEFAULT_PRIORITY() { return 0.5; }
 static get DEFAULT_BUDGET() { return 1.0; }

 get term() { return this._term; }
 get type() { return this._type; }
 get truth() { return this._truth; }
 get stamp() { return this._stamp; }
 get priority() { return this._priority; }
 get budget() { return this._budget; }
 get createdAt() { return this._createdAt; }
 get accessedAt() { return this._accessedAt; }

  withTruth(newTruth) {
    return new Task({ ...this._getAllProperties(), truth: newTruth });
  }

  withPriority(newPriority) {
    return new Task({ ...this._getAllProperties(), priority: newPriority });
  }

  withAccessedAt(newAccessedAt) {
    return new Task({ ...this._getAllProperties(), accessedAt: newAccessedAt });
  }

  isBelief() { return this.type === 'BELIEF'; }
  isGoal() { return this.type === 'GOAL'; }
  isQuestion() { return this.type === 'QUESTION'; }

  equals(other) {
    if (!(other instanceof Task)) return false;
    const truthEquals = (!this.truth && !other.truth) || (this.truth && this.truth.equals(other.truth));
    return this.term.equals(other.term) && this.type === other.type && truthEquals;
  }

  _getAllProperties() {
    return {
      term: this.term,
      type: this.type,
      truth: this.truth,
      stamp: this.stamp,
      priority: this.priority,
      budget: this.budget,
      accessedAt: this.accessedAt
    };
  }
}