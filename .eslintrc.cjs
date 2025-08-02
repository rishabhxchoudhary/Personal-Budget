/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'jest', 'testing-library', 'jest-dom', 'functional', 'sonarjs'],
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'plugin:jest/recommended',
    'plugin:testing-library/react',
    'plugin:jest-dom/recommended',
    'plugin:functional/recommended',
    'plugin:sonarjs/recommended',
    'prettier',
  ],
  env: { 'jest/globals': true },
  rules: {
    // Non-negotiable Clean Code constraints:
    'max-lines-per-function': ['error', { max: 30, skipComments: true, skipBlankLines: true }],
    complexity: ['error', 8],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'functional/immutable-data': 'off', // we’ll allow local mutable state in React components
    'functional/no-let': 'off',
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      rules: {
        'max-lines-per-function': 'off', // tests can be a bit longer
      },
    },
  ],
};
