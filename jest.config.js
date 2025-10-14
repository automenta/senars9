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
  // Serial execution to prevent resource contention during System initialization
  maxWorkers: 1, // Single worker forces serial execution
  testTimeout: 10000, // Increase default test timeout to 10 seconds
  setupFilesAfterEnv: ['<rootDir>/tests/test-setup.js'], // Add test setup file
  // Force exit to ensure cleanup
  forceExit: false,
  // Detect open handles that might cause resource leaks (disable for performance)
  detectOpenHandles: false
};