import boundaries from 'eslint-plugin-boundaries';
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
        name: 'crypto',
        message: "Import from 'node:crypto'.",
    },
    {
        name: '@nestjs/common',
        importNames: ['forwardRef'],
        message:
            'A module cycle is a broken boundary: move the shared piece down, the orchestration into a use case, or the hand-off into a queue job.',
    },
];

const restrictedImportPatterns = [
    {
        regex: '^@generated/prisma-client/internal(/|$)',
        message:
            'Import the Prisma client from @generated/prisma-client/client, enums, models, browser or commonInputTypes, never from internal/.',
    },
];

const featureImportPattern = {
    regex: '^@modules/',
    message:
        'src/common and src/app import nothing from a feature module, a type included (layering.md).',
};

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

const undefinedSyntaxRestrictions = [
    {
        selector: 'ReturnStatement > Identifier.argument[name="undefined"]',
        message: 'Return null, not undefined (null-safety.md).',
    },
    {
        selector:
            'LogicalExpression[operator="??"] > Identifier.right[name="undefined"]',
        message: 'Use a conditional spread, not ?? undefined (null-safety.md).',
    },
    {
        selector:
            'ConditionalExpression > Identifier[name="undefined"]:matches(.consequent, .alternate)',
        message: 'A ternary branch is null, not undefined (null-safety.md).',
    },
    {
        selector: 'ArrowFunctionExpression > Identifier.body[name="undefined"]',
        message: 'Return null, not undefined (null-safety.md).',
    },
];

const forEachRestriction = {
    selector: 'CallExpression[callee.property.name="forEach"]',
    message: 'Use for...of, not .forEach.',
};

const codeStyleSyntaxRestrictions = [
    ...thisCallRestrictions,
    ...undefinedSyntaxRestrictions,
    forEachRestriction,
];

const newDateRestriction = {
    selector: 'NewExpression[callee.name="Date"]',
    message: 'Use HelperDateService.',
};

const throwNewErrorRestriction = {
    selector: 'ThrowStatement > NewExpression[callee.name="Error"]',
    message:
        'Throw a typed exception: AppUnknownException (or a subclass) outside an HTTP request, AppBaseException for one that answers a request.',
};

const ownExceptionName = '/(Exception|^UnrecoverableError)$/';
const instanceofOwnException = path =>
    `[${path}.operator='instanceof'][${path}.right.name=${ownExceptionName}]`;
const guardedByOwnException = [
    `IfStatement${instanceofOwnException('test')}`,
    `IfStatement[test.operator='||']${instanceofOwnException('test.left')}${instanceofOwnException('test.right')}`,
    `IfStatement[test.operator='||'][test.left.operator='||']${instanceofOwnException('test.left.left')}${instanceofOwnException('test.left.right')}${instanceofOwnException('test.right')}`,
].join(', ');

const throwIdentifierRestriction = {
    selector: `ThrowStatement[argument.type='Identifier']:not(:matches(${guardedByOwnException}) > .consequent ThrowStatement)`,
    message:
        'Rethrow a caught value only inside the if branch of an instanceof guard of our own exception (if (err instanceof AppBaseException) { throw err; }); otherwise throw new AppUnknownException(err).',
};

const databaseClientRestriction = {
    selector:
        "MemberExpression[property.name='client'][object.type='MemberExpression'][object.property.name='databaseService']",
    message:
        'Only a repository, a seed, or a health indicator queries databaseService.client; a service or use case calls withTransaction and a repository.',
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

const moduleFunctionRestriction = {
    selector:
        'Program > FunctionDeclaration:not([id.name="bootstrap"]), Program > VariableDeclaration > VariableDeclarator > :matches(ArrowFunctionExpression, FunctionExpression).init',
    message:
        'No module-level function; fold it into the method or class that uses it (code-style.md).',
};

const contextTypeName = '/^I[A-Za-z]+Context$/';

const contextParam = `:matches([typeAnnotation.typeAnnotation.typeName.name=${contextTypeName}], [typeAnnotation.typeAnnotation.types.0.typeName.name=${contextTypeName}])`;

const parameterOrderRestrictions = [
    {
        selector: ':function > Identifier.params[name="tx"]:not(:first-child)',
        message: 'tx is the first parameter (code-style.md).',
    },
    {
        selector: `:function > Identifier.params:not(${contextParam}):not([name="tx"]) ~ Identifier.params${contextParam}`,
        message:
            'A context parameter comes before every other parameter but tx (code-style.md).',
    },
];

const requestUserRestriction = {
    selector:
        'MemberExpression[property.name="user"]:matches([object.name=/^(request|req)$/], [object.callee.property.name="getRequest"])',
    message:
        'Read identity from the request store or the request context, never request.user (security.md).',
};

const codeStyleRestrictedSyntax = [
    ...codeStyleSyntaxRestrictions,
    moduleFunctionRestriction,
    requestUserRestriction,
    ...parameterOrderRestrictions,
    newDateRestriction,
    throwNewErrorRestriction,
    throwIdentifierRestriction,
];

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
        ...codeStyleRestrictedSyntax,
        databaseClientRestriction,
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

const typedLintRules = {
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
};

// Enhanced code quality rules
const codeQualityRules = {
    '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        {
            ignorePrimitives: { boolean: true },
            ignoreMixedLogicalExpressions: true,
            ignoreBooleanCoercion: true,
        },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
            allowExpressions: true,
            allowTypedFunctionExpressions: true,
        },
    ],
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/promise-function-async': [
        'error',
        { checkArrowFunctions: false },
    ],
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
    'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'never', prev: 'import', next: 'import' },
    ],
};

const featureElementTypes = [
    ['controller', 'src/modules/*/controllers/**'],
    ['processor', 'src/modules/*/processors/**'],
    ['use-case', 'src/modules/*/use-cases/**'],
    ['service', 'src/modules/*/services/**'],
    ['repository', 'src/modules/*/repositories/**'],
    ['util', 'src/modules/*/utils/**'],
    ['cache', 'src/modules/*/caches/**'],
    ['queue', 'src/modules/*/queues/**'],
    ['guard', 'src/modules/*/guards/**'],
    ['interceptor', 'src/modules/*/interceptors/**'],
    ['decorator', 'src/modules/*/decorators/**'],
    ['factory', 'src/modules/*/factories/**'],
    ['indicator', 'src/modules/*/indicators/**'],
    ['shape', 'src/modules/*/{constants,dtos,enums,interfaces,exceptions}/**'],
    ['feature', 'src/modules/*/**'],
].map(([type, pattern]) => ({
    type,
    pattern,
    partialMatch: false,
}));

const layerPolicies = [
    {
        from: { element: { type: 'use-case' } },
        disallow: {
            to: {
                element: {
                    types: [
                        'repository',
                        'use-case',
                        'cache',
                        'controller',
                        'processor',
                    ],
                },
            },
        },
        message:
            'A use case injects services, utils, and queue classes, never a repository, a cache, another use case, a controller, or a processor.',
    },
    {
        from: { element: { type: 'service' } },
        disallow: [
            {
                to: {
                    element: {
                        types: ['use-case', 'controller', 'processor'],
                    },
                },
            },
            { to: { file: { categories: ['use-case-module'] } } },
        ],
        message:
            'A service never reaches a use case, a use-case module, a controller, or a processor.',
    },
    {
        from: { element: { types: ['controller', 'processor'] } },
        disallow: {
            to: { element: { types: ['service', 'repository'] } },
        },
        message:
            'A controller or processor calls its feature use cases only, never a service or a repository.',
    },
    {
        from: { element: { type: 'controller' } },
        disallow: {
            to: {
                element: {
                    types: [
                        'util',
                        'cache',
                        'queue',
                        'controller',
                        'processor',
                        'interceptor',
                        'factory',
                        'indicator',
                        'feature',
                    ],
                },
            },
        },
        message:
            'A controller imports the use cases of its own feature and the constants, decorators, dtos, enums, interfaces, exceptions, and guards of any feature only.',
    },
    {
        from: { element: { type: 'repository' } },
        disallow: { to: { element: { type: 'repository' } } },
        message: 'A repository injects no repository.',
    },
    {
        from: { element: { type: 'util' } },
        disallow: {
            to: {
                element: {
                    types: [
                        'service',
                        'repository',
                        'cache',
                        'queue',
                        'use-case',
                        'util',
                    ],
                },
            },
        },
        message:
            'A util is pure shaping: no service, repository, cache, queue class, use case, or src/modules util.',
    },
    {
        from: { element: { types: ['guard', 'interceptor', 'decorator'] } },
        disallow: [
            {
                to: {
                    element: {
                        types: [
                            'repository',
                            'use-case',
                            'controller',
                            'processor',
                        ],
                    },
                },
            },
            { to: { file: { categories: ['module', 'use-case-module'] } } },
        ],
        message:
            'A guard, strategy, interceptor, or decorator reads transport inputs and delegates to a service: never a repository, a use case, a controller, a processor, or a module file.',
    },
    {
        from: { element: { type: 'util' } },
        disallow: [
            {
                to: {
                    element: {
                        types: [
                            'controller',
                            'processor',
                            'guard',
                            'decorator',
                            'interceptor',
                            'factory',
                            'indicator',
                        ],
                    },
                },
            },
            { to: { file: { categories: ['module', 'use-case-module'] } } },
        ],
        message:
            'A util is pure shaping: no module file, controller, processor, guard, decorator, interceptor, factory, or indicator.',
    },
    {
        from: { element: { type: 'processor' } },
        disallow: [
            { to: { element: { types: ['util', 'cache', 'queue'] } } },
            { to: { file: { categories: ['module', 'use-case-module'] } } },
        ],
        message:
            'A processor calls the use cases of its own feature only, never a util, a cache, a queue class, or a module file.',
    },
    {
        from: { file: { categories: ['module', 'use-case-module'] } },
        disallow: { to: { file: { categories: ['use-case-module'] } } },
        message:
            'Only src/router/ imports a use-case module; a feature module and a use-case module import none.',
    },
];

const testSyntaxRestrictions = [
    {
        selector:
            'MemberExpression[property.name="mock"]:not([object.name="vi"])',
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
    forEachRestriction,
];

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
            '.superpowers/*',
            '.scratch/*',
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
            reportUnusedDisableDirectives: 'error',
        },
        plugins: {
            '@typescript-eslint': tsEsLintPlugin,
            security,
        },
        rules: {
            ...rules,
            ...codeQualityRules,
            ...typedLintRules,
            ...securityRules,
            ...importOrderRules,
            ...codeStyleRules,
        },
    },
    {
        name: 'ts/boundaries',
        files: ['src/**/*.ts'],
        plugins: { boundaries },
        settings: {
            'import/resolver': {
                typescript: { project: './tsconfig.json' },
            },
            'boundaries/elements': featureElementTypes,
            'boundaries/files': [
                {
                    pattern: 'src/modules/*/*.use-case.module.ts',
                    category: 'use-case-module',
                },
                {
                    pattern: 'src/modules/*/!(*.use-case).module.ts',
                    category: 'module',
                },
            ],
        },
        rules: {
            'boundaries/dependencies': [
                'error',
                {
                    default: 'allow',
                    checkInternals: true,
                    policies: layerPolicies,
                },
            ],
        },
    },
    {
        name: 'ts/database-client',
        files: [
            'src/**/repositories/**/*.ts',
            'src/modules/health/indicators/**/*.ts',
            'src/migration/**/*.ts',
            'src/common/database/**/*.ts',
        ],
        rules: {
            'no-restricted-syntax': ['error', ...codeStyleRestrictedSyntax],
        },
    },
    {
        name: 'ts/common',
        files: ['src/common/**/*.ts', 'src/app/**/*.ts'],
        ignores: ['src/app/app.module.ts', 'src/common/common.module.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: restrictedImportPaths,
                    patterns: [
                        ...restrictedImportPatterns,
                        relativeImportPattern,
                        featureImportPattern,
                    ],
                },
            ],
        },
    },
    {
        name: 'ts/env-boundary',
        files: [
            'src/configs/**/*.ts',
            'src/bootstrap.ts',
            'src/instrument.ts',
        ],
        rules: {
            'no-restricted-properties': ['error', mathRandomRestriction],
        },
    },
    {
        name: 'ts/other',
        files: ['scripts/**/*.ts', 'vitest.config.ts'],
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
            reportUnusedDisableDirectives: 'error',
        },
        plugins: {
            '@typescript-eslint': tsEsLintPlugin,
        },
        rules: {
            ...rules,
            ...typedLintRules,
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
            noInlineConfig: true,
            reportUnusedDisableDirectives: 'error',
        },
        plugins: {
            '@typescript-eslint': tsEsLintPlugin,
        },
        rules: {
            ...rules,
            ...typedLintRules,
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/promise-function-async': [
                'error',
                { checkArrowFunctions: false },
            ],
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
                {
                    paths: restrictedImportPaths,
                    patterns: [
                        ...restrictedImportPatterns,
                        relativeImportPattern,
                    ],
                },
            ],
            'no-restricted-syntax': ['error', ...testSyntaxRestrictions],
            'no-restricted-properties': [
                'error',
                mathRandomRestriction,
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
    {
        name: 'ts/test-spec',
        files: ['test/**/*.spec.ts'],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...testSyntaxRestrictions,
                {
                    selector: 'FunctionDeclaration',
                    message:
                        'A spec declares no function; move it to test/<type>/helpers/ or test/helpers/',
                },
                {
                    selector:
                        'VariableDeclarator > :matches(ArrowFunctionExpression, FunctionExpression).init',
                    message:
                        'A spec stores no function in a variable; reuse data as a const, logic as a helper',
                },
                {
                    selector:
                        ':matches(ArrowFunctionExpression, FunctionExpression):not(CallExpression[callee.name=/^(describe|it|test|beforeAll|beforeEach|afterAll|afterEach|expect)$/] > .arguments):not(CallExpression[callee.property.name=/^(fn|mock|hoisted|mockImplementation|mockImplementationOnce|only|skip|todo|each|concurrent|sequential)$/] > .arguments):not(CallExpression[callee.callee.property.name="each"] > .arguments)',
                    message:
                        'An arrow is allowed only as a direct argument to describe/it/test/hooks/expect/vi.fn/vi.mock/mockImplementation',
                },
            ],
        },
    },
];
