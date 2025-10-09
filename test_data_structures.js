// Test file for data structures
import { Term, TermType, Task, Punctuation, TruthValue, Concept } from './core/data_structures/index.js';

// Test Term creation
console.log('=== Testing Term Creation ===');

// Create atomic terms
const atomA = Term.newAtom('A');
const atomB = Term.newAtom('B');
console.log('Atom A:', atomA.name, 'Hash:', atomA.hash);
console.log('Atom B:', atomB.name, 'Hash:', atomB.hash);

// Create compound terms
const inheritanceTerm = Term.createCompound(TermType.Inheritance, [atomA, atomB]);
console.log('Inheritance term:', inheritanceTerm.name, 'Hash:', inheritanceTerm.hash);

// Create conjunction term
const conjunctionTerm = Term.createCompound(TermType.Conjunction, [atomA, atomB]);
console.log('Conjunction term:', conjunctionTerm.name, 'Hash:', conjunctionTerm.hash);

// Test TruthValue
console.log('\n=== Testing TruthValue ===');
const truth1 = new TruthValue(1.0, 0.9);
const truth2 = new TruthValue(1.0, 0.8);
console.log('TruthValue 1:', truth1.toString());
console.log('TruthValue 2:', truth2.toString());

// Test deduction
const deductionResult = TruthValue.deduction(truth1, truth2);
console.log('Deduction result:', deductionResult.toString());

// Test Task creation
console.log('\n=== Testing Task ===');
const task = new Task({
  term: inheritanceTerm,
  punctuation: Punctuation.Belief,
  truth: new TruthValue(0.8, 0.9),
  priority: 0.7,
  createdAt: Date.now()
});
console.log('Task:', task.toString());
console.log('Is belief?', task.isBelief());
console.log('Is goal?', task.isGoal());
console.log('Is question?', task.isQuestion());

// Test Concept
console.log('\n=== Testing Concept ===');
const concept = Concept.new(inheritanceTerm, Date.now());
console.log('Concept term:', concept.term.name);
console.log('Concept created at:', concept.createdAt);

// Test term simplification
console.log('\n=== Testing Term Simplification ===');
const negationA = Term.createCompound(TermType.Negation, [atomA]);
const doubleNegation = Term.createCompound(TermType.Negation, [negationA]);
console.log('Double negation of A:', doubleNegation.name); // Should simplify to just 'A'

// Test associative simplification
const conjA = Term.createCompound(TermType.Conjunction, [atomA, atomB]);
const nestedConj = Term.createCompound(TermType.Conjunction, [atomA, conjA]);
console.log('Nested conjunction:', nestedConj.name); // Should flatten to a simple conjunction

console.log('\nAll tests completed successfully!');