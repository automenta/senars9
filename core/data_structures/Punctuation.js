// Punctuation enum - represents the punctuation of a task, indicating its type
export const Punctuation = Object.freeze({
  // Represents a statement of belief
  Belief: '.',
  // Represents a goal to be achieved
  Goal: '!',
  // Represents a question to be answered
  Question: '?'
});

// Static equality method for punctuation comparison
export function punctuationEquals(p1, p2) {
  return p1 === p2;
}