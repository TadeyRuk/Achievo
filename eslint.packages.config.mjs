import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'packages/*/dist/**',
    'packages/*/__tests__/**',
    'packages/stellar/src/generated/**',
  ]),
  {
    files: ['packages/*/src/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: false,
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/frontend/**', '../frontend/**', '../../frontend/**'],
              message: '@achievo/* packages must not import from frontend/',
            },
            {
              group: ['**/api/**', '../api/**', '../../api/**'],
              message: '@achievo/* packages must not import from api/',
            },
          ],
        },
      ],
    },
  },
])
