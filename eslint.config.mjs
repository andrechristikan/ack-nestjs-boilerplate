import eslintConfigPrettier from 'eslint-config-prettier';
import security from 'eslint-plugin-security';
import tsEsLintPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import tsEslint from 'typescript-eslint';

const rules = tsEslint.configs.recommended
    .map(config => config.rules)
    .filter(rules => rules !== undefined)
    .reduce((a, b) => ({ ...b, ...a }), {});

const securityRules = {
    ...Object.fromEntries(
        Object.keys(security.configs.recommended.rules).map(rule => [
            rule,
            'error',
        ])
    ),
    'security/detect-object-injection': 'off',
};

// Enhanced code quality rules
const codeQualityRules = {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
            allowExpressions: true,
            allowTypedFunctionExpressions: true,
        },
    ],
    '@typescript-eslint/explicit-module-boundary-types': 'error',
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
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': 'warn',
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
    curly: ['error', 'all'],
    'no-restricted-properties': [
        'error',
        {
            object: 'Math',
            property: 'random',
            message:
                'Use randomInt from node:crypto through HelperStringService or HelperNumberService.',
        },
    ],
    'no-restricted-imports': [
        'error',
        {
            paths: [
                {
                    name: 'lodash',
                    message: 'Use named imports from lodash-es.',
                },
                {
                    name: 'lodash-es',
                    importNames: ['default'],
                    message:
                        'Use named imports from lodash-es, not a default import.',
                },
                {
                    name: 'crypto-js',
                    message: 'Use node:crypto through the Helper* services.',
                },
                {
                    name: 'crypto',
                    message: "Import from 'node:crypto'.",
                },
            ],
            patterns: [
                {
                    regex: '^@generated/prisma-client/internal(/|$)',
                    message:
                        'Import the Prisma client from @generated/prisma-client/client, enums, models, browser or commonInputTypes, never from internal/.',
                },
                {
                    regex: '^lodash/',
                    message: 'Use named imports from lodash-es.',
                },
            ],
        },
    ],
};

// Import ordering rules
const importOrderRules = {
    'sort-imports': [
        'error',
        {
            ignoreCase: false,
            ignoreDeclarationSort: true,
            ignoreMemberSort: false,
            memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
            allowSeparatedGroups: true,
        },
    ],
};

export default [
    eslintConfigPrettier,
    {
        ignores: [
            '.github/*',
            '.husky/*',
            'coverage/*',
            '.vitest/*',
            'dist/*',
            'docs/*',
            'node_modules/*',
            'src/metadata.ts',
            'src/generated/**',
            'generated/*',
            'logs/*',
            'keys/*',
            '.warmup/*',
            '.nyc_output/*',
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
                tsconfigRootDir: import.meta.dirname,
            },
        },
        linterOptions: {
            noInlineConfig: true,
            reportUnusedDisableDirectives: true,
        },
        plugins: {
            '@typescript-eslint': tsEsLintPlugin,
            security,
        },
        rules: {
            ...rules,
            ...codeQualityRules,
            ...securityRules,
            ...importOrderRules,
        },
    },
    {
        name: 'ts/database-inferred-client',
        files: [
            'src/common/database/utils/database.extension.util.ts',
            'src/common/database/factories/database.client.factory.ts',
        ],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parser: tsParser,
            parserOptions: {
                project: 'tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
        },
        linterOptions: {
            noInlineConfig: true,
            reportUnusedDisableDirectives: true,
        },
        plugins: {
            '@typescript-eslint': tsEsLintPlugin,
            security,
        },
        rules: {
            ...rules,
            ...codeQualityRules,
            ...securityRules,
            ...importOrderRules,
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
        },
    },
    {
        name: 'ts/scripts',
        files: ['scripts/**/*.ts'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parser: tsParser,
            parserOptions: {
                project: 'tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
        },
        linterOptions: {
            noInlineConfig: true,
            reportUnusedDisableDirectives: true,
        },
        plugins: {
            '@typescript-eslint': tsEsLintPlugin,
            security,
        },
        rules: {
            ...rules,
            ...codeQualityRules,
            ...securityRules,
            ...importOrderRules,
            'no-console': 'off',
        },
    },
    {
        name: 'ts/vitest-config',
        files: ['vitest.config.ts'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parser: tsParser,
            parserOptions: {
                project: 'tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
        },
        linterOptions: {
            noInlineConfig: true,
            reportUnusedDisableDirectives: true,
        },
        plugins: {
            '@typescript-eslint': tsEsLintPlugin,
            security,
        },
        rules: {
            ...rules,
            ...codeQualityRules,
            ...securityRules,
            ...importOrderRules,
        },
    },
    {
        name: 'security/non-literal-fs-allowed',
        files: [
            'src/modules/notification/domains/notification.template.*.domain.ts',
            'src/modules/term-policy/domains/term-policy.template.domain.ts',
            'scripts/**/*.ts',
        ],
        plugins: {
            security,
        },
        rules: {
            'security/detect-non-literal-fs-filename': 'off',
        },
    },
    {
        name: 'ts/test',
        files: ['test/**/*.ts'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parser: tsParser,
            parserOptions: {
                project: 'tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
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
