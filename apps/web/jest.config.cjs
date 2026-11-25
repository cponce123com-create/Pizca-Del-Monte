const nextJest = require('next/jest');
const createJestConfig = nextJest({ dir: './' });
module.exports = createJestConfig({
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@pizca/database$': '<rootDir>/../../packages/database/src/index.ts',
    '^@pizca/utils$': '<rootDir>/../../packages/utils/src/index.ts',
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  setupFilesAfterFramework: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
});
