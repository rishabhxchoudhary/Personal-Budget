import nextJest from 'next/jest.js';
const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testPathIgnorePatterns: ['<rootDir>/tests/e2e/', '<rootDir>/.next/', '<rootDir>/node_modules/'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}', '**/?(*.)+(spec|test).{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^next-auth$': '<rootDir>/__mocks__/next-auth.js',
    '^next-auth/(.*)$': '<rootDir>/__mocks__/next-auth.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(next-auth|@auth|oauth4webapi|openid-client|node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill)/)',
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/index.{ts,tsx}',
    '!src/**/types.{ts,tsx}',
    '!src/mocks/**',
  ],
  coverageThreshold: {
    global: { lines: 80, branches: 80, functions: 80, statements: 80 },
    // Raise bar for domain model code:
    './src/features/**/model/**.{ts,tsx}': {
      lines: 90,
      branches: 90,
      functions: 90,
      statements: 90,
    },
  },
};

export default createJestConfig(customJestConfig);
