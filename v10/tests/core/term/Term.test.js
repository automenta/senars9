import { Term } from '../../../src/core/term/Term.js';
import { TermFactory } from '../../../src/core/term/TermFactory.js';

describe('Term & TermFactory', () => {
  let factory;

  beforeEach(() => {
    factory = new TermFactory();
  });

  test('should create an atomic term', () => {
    const atom = factory.create({ components: ['A'] });
    expect(atom).toBeInstanceOf(Term);
    expect(atom.name).toBe('A');
    expect(atom.isAtomic).toBe(true);
    expect(atom.complexity).toBe(1);
  });

  test('should create a compound term', () => {
    const term = factory.create({
      operator: '&',
      components: [factory.create({ components: ['A'] }), factory.create({ components: ['B'] })],
    });
    expect(term).toBeInstanceOf(Term);
    expect(term.name).toBe('(&, A, B)');
    expect(term.isCompound).toBe(true);
    expect(term.complexity).toBe(3); // 1 (op) + 1 (A) + 1 (B)
  });

  test('should handle commutativity', () => {
    const term1 = factory.create({
      operator: '&',
      components: [factory.create({ components: ['A'] }), factory.create({ components: ['B'] })],
    });
    const term2 = factory.create({
      operator: '&',
      components: [factory.create({ components: ['B'] }), factory.create({ components: ['A'] })],
    });
    expect(term1).toBe(term2);
    expect(term1.name).toBe('(&, A, B)');
  });

  test('should handle associativity', () => {
    const term1 = factory.create({
      operator: '&',
      components: [
        factory.create({ components: ['A'] }),
        factory.create({
          operator: '&',
          components: [factory.create({ components: ['B'] }), factory.create({ components: ['C'] })],
        }),
      ],
    });
    expect(term1.name).toBe('(&, A, B, C)');
  });

  test('should handle redundancy', () => {
    const term = factory.create({
      operator: '&',
      components: [
        factory.create({ components: ['A'] }),
        factory.create({ components: ['A'] }),
      ],
    });
    expect(term.name).toBe('(&, A)');
  });

  test('should cache identical terms', () => {
    const term1 = factory.create({ components: ['A'] });
    const term2 = factory.create({ components: ['A'] });
    expect(term1).toBe(term2);
  });

  test('should have strict immutability', () => {
    const atom = factory.create({ components: ['A'] });
    expect(() => {
      atom.name = 'B';
    }).toThrow();
    expect(() => {
      atom.components.push('C');
    }).toThrow();
  });
});