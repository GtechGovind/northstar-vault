import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'docs/ai-studio/**', '.firebase/**', 'coverage/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    files: ['src/**/*.js', 'test/**/*.js', 'security/**/*.js', 'scripts/**/*.mjs', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['public/**/*.js', 'scripts/audit-ui.js'],
    languageOptions: { globals: globals.browser },
  },
];
