/**
 * Term class - represents knowledge elements in the system
 * Implements strict immutability as specified in DESIGN.md
 */

export class Term {
  constructor(components = [], operator = null) {
    // Handle mixed component types (strings and Term objects)
    const processedComponents = [...components].map(comp => {
      if (typeof comp === 'string') {
        // For string components, create a simple atomic term representation
        return { type: 'atomic', value: comp, toString: () => comp };
      }
      return comp;
    });

    // Store components as immutable array
    this._components = Object.freeze(processedComponents);
    this._operator = operator;
    this._id = this.calculateId(); // Cache immutable ID
    this._hashCode = this.calculateHashCode(); // Cache hash code
    this._complexity = this.calculateComplexity(); // Cache complexity

    // Freeze the entire object to ensure strict immutability
    Object.freeze(this);
  }
  
  // Getters return immutable data
  get components() {
    return this._components;
  }
  
  get operator() {
    return this._operator;
  }
  
  get id() {
    return this._id;
  }
  
  // Immutable operations return new Term instances
  withAddedComponent(component) {
    // This would be implemented using TermFactory in the full implementation
    return component; // Placeholder
  }
  
  // Structural comparison
  equals(otherTerm) {
    if (!(otherTerm instanceof Term)) return false;
    if (this._hashCode !== otherTerm._hashCode) return false;
    // Deep comparison logic would be implemented here
    return true;
  }
  
  hashCode() {
    return this._hashCode;
  }
  
  // Sub-term operations
  visit(visitorFn, order = 'pre-order') {
    visitorFn(this);
    this._components.forEach(comp => comp.visit(visitorFn, order));
  }
  
  reduce(reducerFn, initialValue) {
    let result = reducerFn(initialValue, this);
    for (const comp of this._components) {
      result = comp.reduce(reducerFn, result);
    }
    return result;
  }
  
  // Generate string representation
  toString() {
    if (this._operator) {
      const componentStrings = this._components.map(comp => {
        if (typeof comp === 'object' && comp.toString) {
          return comp.toString();
        } else if (typeof comp === 'object' && comp.type === 'atomic') {
          return comp.value;
        } else {
          return String(comp);
        }
      });
      return `(${this._operator}, ${componentStrings.join(', ')})`;
    } else {
      if (this._components.length === 0) return '';
      const comp = this._components[0];
      if (typeof comp === 'object' && comp.type === 'atomic') {
        return comp.value;
      } else if (typeof comp === 'object' && comp.toString) {
        return comp.toString();
      } else {
        return String(comp);
      }
    }
  }
  
  calculateId() {
    // Implementation would generate unique ID
    return Math.random().toString(36).substr(2, 9);
  }
  
  calculateHashCode() {
    // Implementation would generate hash based on structure
    return this.toString().split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
  }
  
  calculateComplexity() {
    // Implementation would calculate structural complexity
    if (this._components.length === 0) {
      return 1; // Atomic term
    }

    return 1 + this._components.reduce((sum, comp) => {
      // Handle both Term objects and atomic components
      if (typeof comp === 'object' && comp.calculateComplexity) {
        return sum + comp.calculateComplexity();
      } else if (typeof comp === 'object' && comp.type === 'atomic') {
        return sum + 1; // Atomic component
      } else {
        return sum + 1; // Fallback
      }
    }, 0);
  }
}