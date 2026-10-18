import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactPlugin from 'eslint-plugin-react'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// P0 prevention: catch missing JSX identifiers at lint time, not at runtime.
// The TeacherManagementPage blank-screen crash (Round 6) was caused by an
// undefined <FileText /> reference — react/jsx-no-undef would have caught it
// immediately on the developer's machine. We enable this rule + several
// related React correctness rules as 'error' so CI fails fast.
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // ── P0 prevention rules ───────────────────────────────────────────────
      // Disallow references to unknown JSX identifiers — catches missing
      // imports like the FileText / Edit crashes from Round 6.
      'react/jsx-no-undef': 'error',
      // Disallow importing submodules of 'react' that don't exist
      'react/no-typos': 'error',
      // Catch duplicate JSX props
      'react/jsx-no-duplicate-props': 'error',
      // Enforce PascalCase component names
      'react/jsx-pascal-case': 'error',
      // ── react-hooks rules (manually enabled since v5's recommended config
      //     is in legacy eslintrc format, not flat config) ─────────────────
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // ── useful React warnings ────────────────────────────────────────────
      'react/jsx-key': 'warn',
      'react/self-closing-comp': 'warn',
      'react/react-in-jsx-scope': 'off',  // React 17+ JSX transform doesn't need React in scope
      'react/prop-types': 'off',          // TypeScript handles this
      // ── Codebase pragmatism ──────────────────────────────────────────────
      // The existing codebase uses `any` extensively (especially for API
      // response payloads). Flag these as warnings, not errors, so we don't
      // block CI on pre-existing usage.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Unused imports are caught by TypeScript compiler at build time too.
      // Keep as warning — the IDE shows them, but they don't block builds.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^(React|_)$' }],
      'no-unused-vars': 'off',  // defer to @typescript-eslint version
      'no-empty-pattern': 'warn',
      'no-empty': 'warn',
    },
  },
])
