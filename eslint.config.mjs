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

const mathRandomRestriction = {
    object: 'Math',
    property: 'random',
    message:
        'Use randomInt from node:crypto through HelperStringService or HelperNumberService.',
};

const processEnvRestriction = {
    object: 'process',
    property: 'env',
    message: 'Read configuration through ConfigService.',
};

const restrictedImportPaths = [
    {
        name: 'lodash',
        message: 'Use named imports from lodash-es.',
    },
    {
        name: 'lodash-es',
        importNames: ['default'],
        message: 'Use named imports from lodash-es, not a default import.',
    },
    {
        name: 'crypto-js',
        message: 'Use node:crypto through the Helper* services.',
    },
    {
        name: 'crypto',
        message: "Import from 'node:crypto'.",
    },
];

const restrictedImportPatterns = [
    {
        regex: '^@generated/prisma-client/internal(/|$)',
        message:
            'Import the Prisma client from @generated/prisma-client/client, enums, models, browser or commonInputTypes, never from internal/.',
    },
    {
        regex: '^lodash/',
        message: 'Use named imports from lodash-es.',
    },
];

const relativeImportPattern = {
    regex: '^\\.',
    message:
        'Import through a tsconfig.json path alias, never a relative path.',
};

const thisCall =
    'CallExpression:matches([callee.object.type="ThisExpression"], [callee.object.object.type="ThisExpression"], [callee.object.object.object.type="ThisExpression"], [callee.object.object.object.object.type="ThisExpression"]):not([callee.property.name="bind"])';

const thisCallWrapper =
    ':matches(AwaitExpression, TSAsExpression, TSNonNullExpression, TSSatisfiesExpression, ChainExpression)';

const thisCallRestrictions = [
    `:matches(CallExpression, NewExpression) > ${thisCall}.arguments`,
    `:matches(CallExpression, NewExpression) > ${thisCallWrapper}.arguments > ${thisCall}`,
    `:matches(IfStatement, WhileStatement, ConditionalExpression) > ${thisCall}.test`,
    `:matches(IfStatement, WhileStatement, ConditionalExpression) > ${thisCallWrapper}.test > ${thisCall}`,
    `ConditionalExpression > ${thisCall}.consequent`,
    `ConditionalExpression > ${thisCallWrapper}.consequent > ${thisCall}`,
    `ConditionalExpression > ${thisCall}.alternate`,
    `ConditionalExpression > ${thisCallWrapper}.alternate > ${thisCall}`,
    `Property > ${thisCall}.value`,
    `Property > ${thisCallWrapper}.value > ${thisCall}`,
    `:matches(UnaryExpression, LogicalExpression, BinaryExpression, TemplateLiteral, SpreadElement) > ${thisCall}`,
    `:matches(UnaryExpression, LogicalExpression, BinaryExpression, TemplateLiteral, SpreadElement) > ${thisCallWrapper} > ${thisCall}`,
    `MemberExpression > ${thisCall}.object`,
    `MemberExpression > ${thisCallWrapper}.object > ${thisCall}`,
    `ThrowStatement > ${thisCall}`,
    `ThrowStatement > ${thisCallWrapper} > ${thisCall}`,
    `ForOfStatement > ${thisCall}.right`,
    `ForOfStatement > ${thisCallWrapper}.right > ${thisCall}`,
    `MemberExpression[computed=true] > ${thisCall}.property`,
    `MemberExpression[computed=true] > ${thisCallWrapper}.property > ${thisCall}`,
].map(selector => ({
    selector,
    message: 'Assign the this-call to a const before using its value.',
}));

const codeStyleSyntaxRestrictions = [
    ...thisCallRestrictions,
    {
        selector:
            'AssignmentExpression[operator="+="] > :matches(Literal[raw=/^[\'"]/], TemplateLiteral)',
        message: 'Compose strings with a template literal.',
    },
    {
        selector:
            'AwaitExpression > CallExpression[callee.property.name=/^(then|catch)$/]',
        message:
            'An awaited promise is guarded by try/catch, not .then()/.catch().',
    },
];

const newDateRestriction = {
    selector: 'NewExpression[callee.name="Date"]',
    message: 'Use HelperDateService.',
};

const orderDirectionRestriction = {
    selector: 'Literal[value=/^(asc|desc)$/]',
    message: 'Use EnumPaginationOrderDirectionType.',
};

const commentRules = {
    'no-warning-comments': [
        'error',
        {
            terms: [
                '@note',
                'note',
                'xxx',
                'hack',
                '@example',
                '@param',
                '@returns',
                '@template',
                '@throws',
                '@private',
                '@export',
                '@class',
                '@implements',
                '@constraint',
                '@remarks',
            ],
            location: 'anywhere',
        },
    ],
    'no-inline-comments': 'error',
};

const namingConventionRules = {
    '@typescript-eslint/naming-convention': [
        'error',
        {
            selector: 'default',
            format: ['camelCase'],
            leadingUnderscore: 'allow',
        },
        {
            selector: 'variable',
            format: ['camelCase', 'PascalCase'],
            leadingUnderscore: 'allow',
        },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'classProperty', format: ['camelCase', 'PascalCase'] },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'interface', format: ['PascalCase'], prefix: ['I'] },
        { selector: 'enum', format: ['PascalCase'], prefix: ['Enum'] },
        { selector: 'enumMember', format: ['camelCase'] },
        { selector: 'objectLiteralProperty', format: null },
        { selector: 'typeProperty', format: null },
        { selector: 'import', format: null },
    ],
};

// Code style rules for src/
const codeStyleRules = {
    'no-restricted-imports': [
        'error',
        {
            paths: restrictedImportPaths,
            patterns: [...restrictedImportPatterns, relativeImportPattern],
        },
    ],
    'no-restricted-properties': [
        'error',
        mathRandomRestriction,
        processEnvRestriction,
    ],
    'no-restricted-syntax': [
        'error',
        ...codeStyleSyntaxRestrictions,
        newDateRestriction,
        orderDirectionRestriction,
    ],
    '@typescript-eslint/member-ordering': [
        'error',
        {
            default: 'never',
            classes: [
                'signature',
                'field',
                'constructor',
                'private-method',
                'protected-method',
                'public-method',
            ],
        },
    ],
    'prefer-template': 'error',
    ...commentRules,
    ...namingConventionRules,
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
    'no-restricted-properties': ['error', mathRandomRestriction],
    'no-restricted-imports': [
        'error',
        {
            paths: restrictedImportPaths,
            patterns: restrictedImportPatterns,
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
            ...codeStyleRules,
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
            ...codeStyleRules,
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
        },
    },
    {
        name: 'code-style/new-date-allowed',
        files: ['src/configs/**/*.ts'],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...codeStyleSyntaxRestrictions,
                orderDirectionRestriction,
            ],
        },
    },
    {
        name: 'code-style/process-env-allowed',
        files: [
            'src/configs/**/*.ts',
            'src/common/common.module.ts',
            'src/main.ts',
            'src/queues/decorators/queue.decorator.ts',
        ],
        rules: {
            'no-restricted-properties': ['error', mathRandomRestriction],
        },
    },
    {
        name: 'code-style/order-direction-allowed',
        files: ['src/common/pagination/enums/pagination.enum.ts'],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...codeStyleSyntaxRestrictions,
                newDateRestriction,
            ],
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
            'no-restricted-imports': [
                'error',
                { patterns: [relativeImportPattern] },
            ],
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'MemberExpression[property.name="mock"]',
                    message:
                        'Assert through toHaveBeenCalledWith and friends, not fn.mock.*',
                },
                {
                    selector: 'ClassDeclaration',
                    message:
                        'A spec declares no class; apply the decorator to a plain object and read the metadata',
                },
                {
                    selector: 'ClassExpression',
                    message:
                        'A spec declares no class; apply the decorator to a plain object and read the metadata',
                },
            ],
            'no-restricted-properties': [
                'error',
                {
                    object: 'vi',
                    property: 'clearAllMocks',
                    message: 'vi.resetAllMocks() in beforeEach.',
                },
            ],
            '@typescript-eslint/ban-ts-comment': [
                'error',
                {
                    'ts-expect-error': true,
                    'ts-ignore': true,
                    'ts-nocheck': true,
                    'ts-check': false,
                },
            ],
            ...commentRules,
            ...namingConventionRules,
        },
    },
];
