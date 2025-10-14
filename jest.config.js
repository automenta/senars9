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
  testTimeout: 10000, // Increase default test timeout to 15 seconds
  setupFilesAfterEnv: ['<rootDir>/tests/test-setup.js'], // Add test setup file
  // Force exit after tests complete to handle any remaining async operations
  forceExit: true,
  // Detect open handles that might cause resource leaks (disabled for performance)
  detectOpenHandles: false
};