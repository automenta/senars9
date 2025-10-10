export default {
  preset: null,
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'mjs'],
  transform: {},
  testPathIgnorePatterns: [
    '/tests/experimental/',
    '/tests/experimental2/'
  ],
  testMatch: ['**/*.test.js', '**/*.spec.js']
};