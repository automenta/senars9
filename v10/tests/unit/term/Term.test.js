import { Term } from '../../../src/core/term/Term.js';

describe('Term', () => {
  test('should create atomic terms with correct properties', () => {
    const atomA = new Term(['A'], null);
    const atomB = new Term(['B'], null);

    expect(atomA.components).toEqual(['A']);
    expect(atomA.operator).toBeNull();
    expect(atomA.id).toBeDefined();
    expect(atomA.hashCode()).toBeDefined();
    expect(atomA.calculateComplexity()).toBe(1);

    expect(atomB.components).toEqual(['B']);
    expect(atomB.operator).toBeNull();
    expect(atomB.id).toBeDefined();
    expect(atomB.hashCode()).toBeDefined();
    expect(atomB.calculateComplexity()).toBe(1);

    expect(atomA.id).not.toBe(atomB.id);
  });

  test('should create compound terms with correct properties', () => {
    const atomA = new Term(['A'], null);
    const atomB = new Term(['B'], null);

    const inheritanceTerm = new Term([atomA, atomB], '-->');

    expect(inheritanceTerm.components).toEqual([atomA, atomB]);
    expect(inheritanceTerm.operator).toBe('-->');
    expect(inheritanceTerm.id).toBeDefined();
    expect(inheritanceTerm.hashCode()).toBeDefined();
    expect(inheritanceTerm.calculateComplexity()).toBe(3); // 1 + 1 + 1
  });

  test('should maintain strict immutability', () => {
    const atom = new Term(['A'], null);

    // Attempting to modify should not work
    expect(() => {
      atom.components = ['B'];
    }).toThrow();

    expect(() => {
      atom.operator = '->';
    }).toThrow();

    expect(() => {
      atom.id = 'new-id';
    }).toThrow();

    // Original values should remain unchanged
    expect(atom.components).toEqual(['A']);
    expect(atom.operator).toBeNull();
  });

  test('should generate consistent hash codes for same content', () => {
    const atomA1 = new Term(['A'], null);
    const atomA2 = new Term(['A'], null);

    expect(atomA1.hashCode()).toBe(atomA2.hashCode());
  });

  test('should generate different hash codes for different content', () => {
    const atomA = new Term(['A'], null);
    const atomB = new Term(['B'], null);

    expect(atomA.hashCode()).not.toBe(atomB.hashCode());
  });

  test('should implement proper equality comparison', () => {
    const atomA1 = new Term(['A'], null);
    const atomA2 = new Term(['A'], null);
    const atomB = new Term(['B'], null);

    expect(atomA1.equals(atomA2)).toBe(true);
    expect(atomA1.equals(atomB)).toBe(false);
    expect(atomA1.equals(null)).toBe(false);
    expect(atomA1.equals({})).toBe(false);
  });

  test('should handle complex nested terms', () => {
    const atomA = new Term(['A'], null);
    const atomB = new Term(['B'], null);
    const atomC = new Term(['C'], null);

    // Create (A --> B)
    const innerTerm = new Term([atomA, atomB], '-->');
    // Then create ((A --> B) --> C)
    const outerTerm = new Term([innerTerm, atomC], '-->');

    expect(outerTerm.components).toEqual([innerTerm, atomC]);
    expect(outerTerm.operator).toBe('-->');
    expect(outerTerm.calculateComplexity()).toBe(5); // 1 + (1 + 1 + 1) + 1 = 5
  });

  test('should implement visitor pattern correctly', () => {
    const atomA = new Term(['A'], null);
    const atomB = new Term(['B'], null);
    const compoundTerm = new Term([atomA, atomB], '&');

    const visited = [];
    compoundTerm.visit((term) => visited.push(term.components[0] || term));

    expect(visited).toHaveLength(3); // compound + A + B
    expect(visited[0]).toBe(compoundTerm);
    expect(visited[1]).toBe('A');
    expect(visited[2]).toBe('B');
  });

  test('should implement reduce pattern correctly', () => {
    const atomA = new Term(['A'], null);
    const atomB = new Term(['B'], null);
    const compoundTerm = new Term([atomA, atomB], '&');

    const result = compoundTerm.reduce((acc, term) => {
      if (term.operator === null) {
        return acc + (term.components[0] || '');
      }
      return acc + term.operator;
    }, '');

    expect(result).toBe('&AB');
  });

  test('should generate correct string representation for atomic terms', () => {
    const atom = new Term(['A'], null);
    expect(atom.toString()).toBe('A');
  });

  test('should generate correct string representation for compound terms', () => {
    const atomA = new Term(['A'], null);
    const atomB = new Term(['B'], null);
    const inheritanceTerm = new Term([atomA, atomB], '-->');

    expect(inheritanceTerm.toString()).toBe('(A, (A, B))');
  });

  test('should handle empty components', () => {
    const emptyTerm = new Term([], null);
    expect(emptyTerm.components).toEqual([]);
    expect(emptyTerm.calculateComplexity()).toBe(1);
    expect(emptyTerm.toString()).toBe('');
  });

  test('should handle mixed component types', () => {
    const atomA = new Term(['A'], null);
    const atomB = new Term(['B'], null);

    // Test with mixed string and Term components
    const mixedTerm = new Term(['A', atomB], '&');

    expect(mixedTerm.components).toEqual(['A', atomB]);
    expect(mixedTerm.toString()).toBe('(A, (B, B))');
  });

  test('should calculate complexity correctly for nested structures', () => {
    const atomA = new Term(['A'], null); // complexity = 1
    const atomB = new Term(['B'], null); // complexity = 1
    const atomC = new Term(['C'], null); // complexity = 1

    // Simple compound: complexity = 1 + 1 + 1 = 3
    const simpleCompound = new Term([atomA, atomB], '&');
    expect(simpleCompound.calculateComplexity()).toBe(3);

    // Nested compound: complexity = 1 + 3 + 1 = 5
    const nestedCompound = new Term([simpleCompound, atomC], '-->');
    expect(nestedCompound.calculateComplexity()).toBe(5);
  });

  test('should handle edge cases and error conditions', () => {
    const term = new Term(['A'], null);

    // Test equals with various types
    expect(term.equals(null)).toBe(false);
    expect(term.equals({})).toBe(false);
    expect(term.equals('not a term')).toBe(false);
    expect(term.equals(new Term(['B'], null))).toBe(false);
    expect(term.equals(new Term(['A'], null))).toBe(true);
  });
});