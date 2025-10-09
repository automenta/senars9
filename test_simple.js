// Simple test to isolate the issue
import { Term, TermType } from './core/data_structures/index.js';

// Create atomic terms
const atomA = Term.newAtom('A');
const atomB = Term.newAtom('B');
console.log('Atom A:', atomA.name, 'Hash:', atomA.hash);
console.log('Atom B:', atomB.name, 'Hash:', atomB.hash);

// Try creating a simple compound term
console.log('Creating inheritance term...');
try {
  const inheritanceTerm = Term.createCompound(TermType.Inheritance, [atomA, atomB]);
  console.log('Inheritance term:', inheritanceTerm.name, 'Hash:', inheritanceTerm.hash);
} catch (e) {
  console.error('Error creating inheritance term:', e.message);
  console.error(e.stack);
}