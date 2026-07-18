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
  {
    files: ['api/_server/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@vercel/node',
              message: 'Feature cores must stay framework-neutral — use HttpRequest/HttpResult.',
            },
          ],
          patterns: [
            {
              group: ['**/frontend/**', '../frontend/**', '../../frontend/**'],
              message: 'api must not import from frontend/',
            },
            {
              group: [
                '**/infrastructure/**',
                '../../infrastructure/**',
                '../../../infrastructure/**',
                '../../../../infrastructure/**',
              ],
              message: 'Feature cores must depend on ports, not concrete infrastructure.',
            },
            {
              group: [
                '**/composition/**',
                '../../composition/**',
                '../../../composition/**',
              ],
              message: 'Feature cores must not import composition wiring.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['api/_server/infrastructure/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/frontend/**', '../frontend/**', '../../frontend/**'],
              message: 'api must not import from frontend/',
            },
            {
              group: [
                '**/features/**',
                '../../features/**',
                '../../../features/**',
                '**/composition/**',
                '../../composition/**',
                '../../../composition/**',
              ],
              message: 'Infrastructure must not import features or composition.',
            },
          ],
        },
      ],
    },
  },
])
