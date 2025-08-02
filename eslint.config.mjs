import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Ignore patterns
  {
    ignores: [
      // Dependencies
      'node_modules/**',
      '.pnpm-store/**',

      // Build outputs
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',

      // Test coverage
      'coverage/**',
      '.nyc_output/**',

      // Environment files
      '.env',
      '.env.*',

      // IDE
      '.vscode/**',
      '.idea/**',

      // OS files
      '**/.DS_Store',
      '**/Thumbs.db',

      // Logs
      '**/*.log',
      '**/npm-debug.log*',
      '**/yarn-debug.log*',
      '**/yarn-error.log*',
      '**/pnpm-debug.log*',

      // Misc
      '**/*.swp',
      '**/*.swo',
      '**/*~',

      // Playwright
      'playwright-report/**',
      'test-results/**',
    ],
  },
  // Next.js configurations
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];

export default eslintConfig;
