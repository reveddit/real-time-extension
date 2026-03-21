import js from '@eslint/js'
import globals from 'globals'
import eslintConfigPrettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    eslintConfigPrettier,
    {
        files: ['src/**/*.{js,ts}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.webextensions,
                chrome: 'readonly',
                $: 'readonly',
                jQuery: 'readonly',
                __BUILT_FOR__: 'readonly',
                self: 'readonly',
            },
        },
        rules: {
            // Permissive initially — don't break existing code
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            'no-console': 'off',
            'no-undef': 'error',
            'no-constant-condition': 'warn',
            'no-empty': 'warn',
            'no-redeclare': 'warn',
            'no-prototype-builtins': 'off',
            'prefer-const': 'off', // too noisy for existing code
            'no-useless-assignment': 'warn',
            'no-useless-escape': 'warn',
            '@typescript-eslint/no-unused-expressions': 'warn',
        },
    },
    {
        // Only lint source files, not build outputs or libraries
        ignores: [
            'dist-*/**',
            'lib/**',
            'node_modules/**',
            'web-ext-artifacts/**',
            'scripts/**',
            '*.zip',
        ],
    },
]
