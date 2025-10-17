import { Stamp } from '../../../src/core/task/Stamp.js';

describe('Stamp', () => {
  test('should create a new Stamp instance with correct properties', () => {
    const stamp = Stamp.createInput();
    expect(stamp.creationTime).toBeDefined();
    expect(stamp.occurrenceTime).toBeDefined();
    expect(stamp.fromConcept).toBeNull();
  });

  test('should enforce immutability', () => {
    const stamp = Stamp.createInput();
    expect(() => {
      stamp.creationTime = 123;
    }).toThrow();
  });
});