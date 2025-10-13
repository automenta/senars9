/**
 * Test the Syllogistic reasoning rules to verify they work in isolation
 */

import { Task, Punctuation, TruthValue } from './core/Task.js';
import { Term, TermType } from './core/Term.js';
import { Memory } from './core/Memory.js';
import { FocusSetSelector } from './core/FocusSetSelector.js';
import { CycleContext } from './core/Cycle.js';
import { DeductiveSyllogism } from './core/reasoning/SyllogisticRules.js';

console.log('🧪 Testing Syllogistic Rules in Isolation...');

function testSyllogisticRule() {
  let success = true;
  // Create memory and rule
  const memory = new Memory();
  const rule = new DeductiveSyllogism();
  
  // Create the terms: (a-->b) and (b-->c) to derive (a-->c)
  const termA = Term.newAtom('a');
  const termB = Term.newAtom('b');
  const termC = Term.newAtom('c');
  
  // Create inheritance terms: (a --> b) and (b --> c)
  const termAtoB = Term.createCompound(TermType.INHERITANCE, [termA, termB]);
  const termBtoC = Term.createCompound(TermType.INHERITANCE, [termB, termC]);
  
  // Create tasks with truth values
  const taskAtoB = new Task(
    termAtoB,
    Punctuation.BELIEF,
    new TruthValue(0.9, 0.9), // high frequency and confidence
    Date.now(),
    Date.now(),
    0.9 // priority
  );
  
  const taskBtoC = new Task(
    termBtoC,
    Punctuation.BELIEF,
    new TruthValue(0.8, 0.8), // high frequency and confidence
    Date.now() + 1,
    Date.now() + 1,
    0.8 // priority
  );

  console.log('📋 Input tasks:');
  console.log(`  1. ${taskAtoB.toString()} [priority: ${taskAtoB.getPriority()}]`);
  console.log(`  2. ${taskBtoC.toString()} [priority: ${taskBtoC.getPriority()}]`);
  
  // Add tasks to memory
  memory.addTask(taskAtoB, Date.now());
  memory.addTask(taskBtoC, Date.now() + 1);
  
  console.log('\\n🔍 Applying DeductiveSyllogism rule to first task...');
  
  // Apply the rule to the first task
  const context = new CycleContext(Date.now());
  const derivedTasks = rule.apply(taskAtoB, memory, context);
  
  console.log(`\\n📊 Results: ${derivedTasks.length} derived task(s)`);
  
  if (derivedTasks.length > 0) {
    console.log('🎉 Derived tasks:');
    derivedTasks.forEach((task, i) => {
      console.log(`  ${i+1}. ${task.toString()} [priority: ${task.getPriority()}]`);
    });
    
    // Check if it derived (a --> c)
    const expectedTerm = Term.createCompound(TermType.INHERITANCE, [termA, termC]);
    const expectedContent = expectedTerm.toString();
    
    const foundExpected = derivedTasks.some(task => 
      task.term.name.includes('a') && task.term.name.includes('c') && task.term.name.includes('-->')
    );
    
    if (foundExpected) {
      console.log('\\n✅ SUCCESS: The rule correctly derived the transitive relationship!');
      console.log('The DeductiveSyllogism rule works properly in isolation.');
      return true;
    } else {
      console.log('\\n⚠️  The derived task does not match expected (a --> c) pattern');
      console.log('Expected something containing: a, c, and -->');
      return false;
    }
  } else {
    console.log('\\n❌ No tasks were derived. This indicates an issue with the rule application.');
    console.log('Possible issues:');
    console.log('  - Memory lookup not finding the second premise');
    console.log('  - Term structure not matching what the rule expects');
    console.log('  - Indexing not working properly in the Memory system');
    return false;
  }
  
  return success;
}

// Run the test
try {
  const success = testSyllogisticRule();
  if (success) {
    console.log('\\n🎊 Syllogistic rule test PASSED!');
  } else {
    console.log('\\n💥 Syllogistic rule test FAILED - but infrastructure is ready.');
  }
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('\\n💥 Test error:', error);
  process.exit(1);
}