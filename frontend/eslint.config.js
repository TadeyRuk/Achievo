import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
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
              group: ['../../api/**', '../../../api/**', '../../../../api/**'],
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
              group: ['../../api/**', '../../../api/**', '../../../../api/**'],
              message: 'frontend must not import from api/',
            },
          ],
        },
      ],
    },
  },
  {
    // Each feature folder is an isolated vertical slice. Domain logic shared
    // across features (e.g. progression, reward formatting) belongs in
    // src/shared/, not reached into via a relative path across features.
    // wallet.ts is excluded here because it has its own block above with a
    // deliberately different (SDK-permitting) rule set as the confinement point.
    files: ['src/features/!(wallet)/**/*.{ts,tsx}', 'src/features/wallet/!(wallet).{ts,tsx}'],
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
              group: ['../../api/**', '../../../api/**', '../../../../api/**'],
              message: 'frontend must not import from api/',
            },
            {
              group: ['**/packages/*/src/**', '../../packages/**'],
              message: 'Import @achievo/* packages by package name, not deep relative paths.',
            },
            {
              // Explicit sibling-feature names (not a `*` wildcard) so this
              // never accidentally matches ../../shared/** or ../../hooks/**.
              group: [
                '../dashboard/**',
                '../earn/**',
                '../feedback/**',
                '../history/**',
                '../onboarding/**',
                '../profile/**',
                '../wallet/**',
                '../../features/dashboard/**',
                '../../features/earn/**',
                '../../features/feedback/**',
                '../../features/history/**',
                '../../features/onboarding/**',
                '../../features/profile/**',
                '../../features/wallet/**',
              ],
              message:
                'No cross-feature imports. Shared logic belongs in src/shared/ — move it there instead of reaching into another feature.',
            },
          ],
        },
      ],
    },
  },
])
