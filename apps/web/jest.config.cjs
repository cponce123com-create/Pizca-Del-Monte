const nextJest = require('next/jest');
const createJestConfig = nextJest({ dir: './' });
module.exports = createJestConfig({
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1', '^@pizca/database$': '<rootDir>/../../packages/database/src/index.ts' },
  testMatch: ['<rootDir>/tests/**/*.test.js'],
});
