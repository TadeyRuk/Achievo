import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['api/__tests__/**', 'api/vitest.config.ts', 'api/coverage/**']),
  {
    files: ['api/**/*.{ts,tsx}'],
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
              message: 'api must not import from frontend/',
            },
          ],
        },
      ],
    },
  },
])
