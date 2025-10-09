// More detailed test for term simplification
import { Term, TermType } from './core/data_structures/index.js';

// Create atomic terms
const atomA = Term.newAtom('A');
const atomB = Term.newAtom('B');
console.log('Atom A:', atomA.name, 'Hash:', atomA.hash);
console.log('Atom B:', atomB.name, 'Hash:', atomB.hash);

// Test conjunction term
const conjAB = Term.createCompound(TermType.Conjunction, [atomA, atomB]);
console.log('Conjunction (A, B):', conjAB.name, 'Components:', conjAB.components?.length);

// Test nested conjunction: (&, A, (&, A, B)) - this should create a nested structure
const nestedConj = Term.createCompound(TermType.Conjunction, [atomA, conjAB]);
console.log('Nested conjunction:', nestedConj.name, 'Components:', nestedConj.components?.length);

// Double negation test
const negationA = Term.createCompound(TermType.Negation, [atomA]);
console.log('Negation of A:', negationA.name);

const doubleNegation = Term.createCompound(TermType.Negation, [negationA]);
console.log('Double negation of A:', doubleNegation.name); // Should simplify to just 'A'