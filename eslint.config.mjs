import eslintConfigPrettier from 'eslint-config-prettier';
import tsEsLintPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import tsEslint from 'typescript-eslint';

const rules = tsEslint.configs.recommended
    .map(config => config.rules)
    .filter(rules => rules !== undefined)
    .reduce((a, b) => ({ ...b, ...a }), {});

// Enhanced code quality rules
const codeQualityRules = {
    '@typescript-eslint/no-explicit-any': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
        'warn',
        {
            args: 'all',
            argsIgnorePattern: '^_',
            caughtErrors: 'all',
            caughtErrorsIgnorePattern: '^_',
            destructuredArrayIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            ignoreRestSiblings: true,
        },
    ],
};

// TODO: (v8) Uncomment for next release
// const codeQualityRules = {
//     '@typescript-eslint/no-explicit-any': 'warn',
//     '@typescript-eslint/explicit-function-return-type': [
//         'warn',
//         {
//             allowExpressions: true,
//             allowTypedFunctionExpressions: true,
//         },
//     ],
//     '@typescript-eslint/explicit-module-boundary-types': 'warn',
//     '@typescript-eslint/no-unused-vars': [
//         'warn',
//         {
//             args: 'all',
//             argsIgnorePattern: '^_',
//             caughtErrors: 'all',
//             caughtErrorsIgnorePattern: '^_',
//             destructuredArrayIgnorePattern: '^_',
//             varsIgnorePattern: '^_',
//             ignoreRestSiblings: true,
//         },
//     ],
//     'prefer-const': 'error',
//     'no-var': 'error',
//     'no-console': 'warn',
//     eqeqeq: ['error', 'always', { null: 'ignore' }],
//     'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
//     curly: ['error', 'all'],
// };

// Import ordering rules
const importOrderRules = {};
// TODO: (v8) Uncomment for next release
// const importOrderRules = {
//     'sort-imports': [
//         'error',
//         {
//             ignoreCase: false,
//             ignoreDeclarationSort: true,
//             ignoreMemberSort: false,
//             memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
//             allowSeparatedGroups: true,
//         },
//     ],
// };

export default [
    eslintConfigPrettier,
    {
        ignores: [
            '.github/*',
            '.husky/*',
            'coverage/*',
            'dist/*',
            'docs/*',
            'node_modules/*',
            'src/metadata.ts',
            'logs/*',
        ],
    },
    {
        name: 'ts/default',
        files: ['src/**/*.ts'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parser: tsParser,
            parserOptions: {
                project: 'tsconfig.json',
                tsconfigRootDir: '.',
            },
        },
        linterOptions: {
            noInlineConfig: true,
            reportUnusedDisableDirectives: true,
        },
        plugins: {
            '@typescript-eslint': tsEsLintPlugin,
        },
        rules: {
            ...rules,
            ...codeQualityRules,
            ...importOrderRules,
        },
    },
    {
        name: 'ts/test',
        files: ['test/**/*.spec.ts'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parser: tsParser,
            parserOptions: {
                project: 'tsconfig.json',
                tsconfigRootDir: '.',
            },
        },
        linterOptions: {
            noInlineConfig: false,
            reportUnusedDisableDirectives: true,
        },
        plugins: {
            '@typescript-eslint': tsEsLintPlugin,
        },
        rules: {
            ...rules,
            '@typescript-eslint/no-explicit-any': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    args: 'all',
                    argsIgnorePattern: '^_',
                    caughtErrors: 'all',
                    caughtErrorsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],
        },
    },
];
