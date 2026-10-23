import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Правила без информации о типах: server использует TypeScript 7, у которого
// нет JS API компилятора, а type-aware правила typescript-eslint на него
// опираются. Поэтому парсинг идёт через корневой TypeScript 5, а проверку
// типов каждый пакет делает сам (`npm run typecheck`).
export default defineConfig([
  globalIgnores(['**/dist', '**/node_modules', '**/@mf-types', '**/coverage']),

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    files: [
      'server/**/*.ts',
      '*/rspack.config.ts',
      '*/module-federation.config.ts',
      '*.config.js',
    ],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    files: ['shell/src/**/*.{ts,tsx}', 'transactions/src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: {
      globals: globals.browser,
    },
  },

  prettier,
]);
