// eslint.config.js — ESLint flat config (auto-detected by ESLint 8.57+).
// Cross-platform: no ESLINT_USE_FLAT_CONFIG env var needed.

import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
    // Don't lint build output, deps, generated verification bundles, config files, or
    // local agent tooling (`.claude/` is git-ignored and runs on Node, not in the browser).
    {
        ignores: ['dist/**', 'node_modules/**', 'scripts/**', '.claude/**', '*.config.js', '*.config.ts'],
    },

    js.configs.recommended,

    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
                ecmaFeatures: { jsx: true },
            },
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            react,
            'react-hooks': reactHooks,
        },
        settings: {
            react: { version: 'detect' },
        },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            ...react.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,

            // React 18 automatic JSX runtime — no need to import React in scope.
            'react/react-in-jsx-scope': 'off',
            'react/jsx-uses-react': 'off',
            // TypeScript handles prop typing; PropTypes are redundant here.
            'react/prop-types': 'off',
            // Unescaped apostrophes/quotes in JSX copy are intentional and harmless
            // for this content-heavy app; the escape codes just hurt readability.
            'react/no-unescaped-entities': 'off',

            // `no-undef` is a false-positive machine on TypeScript (it doesn't know
            // about type-only globals like `React`); tsc already enforces this.
            'no-undef': 'off',

            // Allow intentionally-unused args/vars prefixed with underscore
            // (e.g. the `_income` / `_withdrawal` API-consistency params).
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
            ],

            // Advisory (non-blocking) — a backlog to chip away at, not a build gate.
            // Most remaining `any`s are Recharts formatter/tooltip callbacks.
            '@typescript-eslint/no-explicit-any': 'warn',
            'react-hooks/exhaustive-deps': 'warn',
            // react-hooks v7 flags every setState-in-effect, incl. the wizard step/URL sync and
            // route guards. Fixing means deriving state during render — a behavioral change to
            // navigation, so it's a backlog item (like no-explicit-any), not a build gate.
            'react-hooks/set-state-in-effect': 'warn',
        },
    },
];
