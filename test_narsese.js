import NarseseTranslator from './core/lm/NarseseTranslator.js';

// Create an instance of the translator
const translator = new NarseseTranslator();

// Test the conversion as done in the failing test
console.log("Testing Narsese conversion...");

// Test the convertToNarsese functionality
const result = translator.convertToNarsese('Hello world');
console.log('convertToNarsese result:', result);

// Test the convertFromNarsese functionality
const backToText = translator.convertFromNarsese(result.narsese);
console.log('convertFromNarsese result:', backToText);
console.log('Expected: Hello world');
console.log('Match:', backToText === 'Hello world');

// Additional test cases
console.log("\nAdditional tests:");
console.log("Input: 'cat animal', Narsese:", translator.convertToNarsese('cat animal').narsese);
console.log("Back to text:", translator.convertFromNarsese(translator.convertToNarsese('cat animal').narsese));

console.log("\nAll tests completed.");