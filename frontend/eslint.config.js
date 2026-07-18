import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@stellar/stellar-sdk',
              message:
                'Confine @stellar/stellar-sdk to features/wallet/wallet.ts (and tests). Prefer @achievo/stellar or wallet helpers.',
            },
          ],
          patterns: [
            {
              group: ['**/api/**', '../../api/**', '../../../api/**'],
              message: 'frontend must not import from api/',
            },
            {
              group: ['**/packages/*/src/**', '../../packages/**'],
              message: 'Import @achievo/* packages by package name, not deep relative paths.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/features/wallet/wallet.ts',
      'src/test/**/*.{ts,tsx}',
      'src/__tests__/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/api/**', '../../api/**', '../../../api/**'],
              message: 'frontend must not import from api/',
            },
          ],
        },
      ],
    },
  },
])
