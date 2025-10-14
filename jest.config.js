export default {
  preset: null,
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'mjs'],
  transform: {},
  testPathIgnorePatterns: [
    '/tests/experimental/',
    '/tests/experimental2/',
    '/ui/'
  ],
  testMatch: ['**/*.test.js', '**/*.spec.js', '**/*.test.mjs', '**/*.spec.mjs'],
  // Improve test isolation and reduce resource contention
  maxWorkers: '50%', // Use 50% of available cores to reduce resource contention
  testTimeout: 15000, // Increase default test timeout to 15 seconds
  setupFilesAfterEnv: ['<rootDir>/tests/test-setup.js'], // Add test setup file
  // Run tests serially for integration tests to avoid resource conflicts
  // runInBand: false, // Allow parallel execution but with worker limits
  // Force exit to ensure cleanup
  forceExit: true,
  // Detect open handles that might cause resource leaks
  detectOpenHandles: true
};