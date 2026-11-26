import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'dist/',
      '.astro/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      'docs/',
      'design/',
      'node_modules/',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...astro.configs.recommended,
  {
    files: ['*.mjs', '*.config.ts'],
    languageOptions: { globals: globals.node },
  },
);
