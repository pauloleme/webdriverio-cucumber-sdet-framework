import typescriptEslintParser from '@typescript-eslint/parser';
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';

export default [
    {
        ignores: [
            'node_modules/**',
            'allure-results/**',
            'allure-report/**',
            'screenshots/**',
            'logs/**',
            'dist/**'
        ]
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: typescriptEslintParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module'
            }
        },
        plugins: {
            '@typescript-eslint': typescriptEslintPlugin
        },
        rules: {
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_'
                }
            ],
            'semi': ['error', 'always'],
            'quotes': ['error', 'single', { avoidEscape: true }],
            '@typescript-eslint/no-explicit-any': 'warn'
        }
    }
];
