import { readFileSync, readdirSync } from 'node:fs';
import boundaries from 'eslint-plugin-boundaries';
import eslintConfigPrettier from 'eslint-config-prettier';
import security from 'eslint-plugin-security';
import tsEsLintPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import tsEslint from 'typescript-eslint';

/** Module discovery: the feature modules whose module file declares @Global(), read at load. */

/** The directory that holds the feature modules. */
const modulesRoot = `${import.meta.dirname}/src/modules`;

/** The names of the feature modules whose module file declares @Global(). */
const globalModules = readdirSync(modulesRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .filter(entry =>
        readdirSync(`${modulesRoot}/${entry.name}`).some(
            file =>
                file.endsWith('.module.ts') &&
                !file.endsWith('.use-case.module.ts') &&
                readFileSync(
                    `${modulesRoot}/${entry.name}/${file}`,
                    'utf8'
                ).includes('@Global()')
        )
    )
    .map(entry => entry.name);

/** Restricted globals, properties, and imports. */

/** The global number functions, refused in favor of their Number forms. */
const numberGlobalRestrictions = [
    'parseInt',
    'parseFloat',
    'isNaN',
    'isFinite',
].map(name => ({
    name,
    message: `The global ${name} is refused: call Number.${name}.`,
}));

/** The process.env read, refused in favor of ConfigService. */
const processEnvRestriction = {
    object: 'process',
    property: 'env',
    message: 'Read configuration through ConfigService.',
};

/** The module paths refused, whole or by import name. */
const restrictedImportPaths = [
    {
        name: 'crypto',
        message: "Import from 'node:crypto'.",
    },
    {
        name: '@nestjs/common',
        importNames: ['forwardRef'],
        message:
            "A module cycle is refused: move the shared piece down, the orchestration into a use case, or the side effect into the owning module's queue class.",
    },
];

/** The import patterns refused in every src and test file. */
const restrictedImportPatterns = [
    {
        regex: '^@generated/prisma-client/internal(/|$)',
        message:
            'Import the Prisma client from @generated/prisma-client/client, enums, models, browser or commonInputTypes, never from internal/.',
    },
];

/** The feature module import, refused in src/common and src/app, their root module files excepted. */
const featureImportPattern = {
    regex: '^@modules/',
    message:
        'src/common and src/app import nothing from a feature module, a type included.',
};

/** The relative import, refused in favor of a tsconfig.json path alias. */
const relativeImportPattern = {
    regex: '^\\.',
    message:
        'Import through a tsconfig.json path alias, never a relative path.',
};

/** The no-restricted-imports setting shared by src and test files. */
const restrictedImportsRule = [
    'error',
    {
        paths: restrictedImportPaths,
        patterns: [...restrictedImportPatterns, relativeImportPattern],
    },
];

/** Restricted syntax, code style: what every file under src/ refuses. */

/** The selector of a call on this, up to four member levels deep, bind excluded. */
const thisCall =
    'CallExpression:matches([callee.object.type="ThisExpression"], [callee.object.object.type="ThisExpression"], [callee.object.object.object.type="ThisExpression"], [callee.object.object.object.object.type="ThisExpression"]):not([callee.property.name="bind"])';

/** The nodes a this-call hides behind without changing its value. */
const thisCallWrapper =
    ':matches(AwaitExpression, TSAsExpression, TSNonNullExpression, TSSatisfiesExpression, ChainExpression)';

/** The this-call a throw may carry: the repository base's `this.toException(...)` mapper, which returns the exception. */
const thisCallNotRepositoryErrorMapper = `${thisCall}:not([callee.object.type="ThisExpression"][callee.property.name="toException"])`;

/** Each parent of a this-call, with the field the call fills ('' when it is the whole child) and the call selector it refuses. */
const thisCallParents = [
    [':matches(CallExpression, NewExpression)', '.arguments'],
    [':matches(IfStatement, WhileStatement, ConditionalExpression)', '.test'],
    ['ConditionalExpression', '.consequent'],
    ['ConditionalExpression', '.alternate'],
    ['Property', '.value'],
    [
        ':matches(UnaryExpression, LogicalExpression, BinaryExpression, TemplateLiteral, SpreadElement)',
        '',
    ],
    ['MemberExpression', '.object'],
    ['ThrowStatement', '', thisCallNotRepositoryErrorMapper],
    ['ForOfStatement', '.right'],
    ['MemberExpression[computed=true]', '.property'],
];

/** A this-call used as a value, bare or through a wrapper, refused. */
const thisCallRestrictions = thisCallParents
    .flatMap(([parent, field, call = thisCall]) => [
        `${parent} > ${call}${field}`,
        `${parent} > ${thisCallWrapper}${field} > ${call}`,
    ])
    .map(selector => ({
        selector,
        message: 'Assign the this-call to a const before using its value.',
    }));

/** The literal undefined, refused as a return, a ?? operand, and a ternary branch. */
const undefinedSyntaxRestrictions = [
    {
        selector:
            'ReturnStatement > Identifier.argument[name="undefined"], ArrowFunctionExpression > Identifier.body[name="undefined"]',
        message: 'Return null, not undefined.',
    },
    {
        selector:
            'LogicalExpression[operator="??"] > Identifier.right[name="undefined"]',
        message: 'Use a conditional spread, not ?? undefined.',
    },
    {
        selector:
            'ConditionalExpression > Identifier[name="undefined"]:matches(.consequent, .alternate)',
        message: 'A ternary branch is null, not undefined.',
    },
];

/** The forEach call, refused in favor of for...of. */
const forEachRestriction = {
    selector: 'CallExpression[callee.property.name="forEach"]',
    message: 'Use for...of, not .forEach.',
};

/** The Date constructor, refused in favor of HelperDateService. */
const newDateRestriction = {
    selector: 'NewExpression[callee.name="Date"]',
    message: 'Use HelperDateService.',
};

/** The throw of a bare Error, refused in favor of a typed exception. */
const throwNewErrorRestriction = {
    selector: 'ThrowStatement > NewExpression[callee.name="Error"]',
    message:
        'Throw a typed exception: AppUnknownException (or a subclass) outside an HTTP request, AppBaseException for one that answers a request.',
};

/** The regex source that matches the names of our own exceptions and BullMQ's UnrecoverableError. */
const ownExceptionName = '/(Exception|^UnrecoverableError)$/';

/** The selector of an instanceof test against our own exception at a path. */
const instanceofOwnException = path =>
    `[${path}.operator='instanceof'][${path}.right.name=${ownExceptionName}]`;

/** The if statements whose test is one to three instanceof checks against our own exceptions. */
const guardedByOwnException = [
    `IfStatement${instanceofOwnException('test')}`,
    `IfStatement[test.operator='||']${instanceofOwnException('test.left')}${instanceofOwnException('test.right')}`,
    `IfStatement[test.operator='||'][test.left.operator='||']${instanceofOwnException('test.left.left')}${instanceofOwnException('test.left.right')}${instanceofOwnException('test.right')}`,
].join(', ');

/** The rethrow of a caught value, refused outside an instanceof guard of our own exception. */
const throwIdentifierRestriction = {
    selector: `ThrowStatement[argument.type='Identifier']:not(:matches(${guardedByOwnException}) > .consequent ThrowStatement)`,
    message:
        'Rethrow a caught value only inside the if branch of an instanceof guard of our own exception (if (err instanceof AppBaseException) { throw err; }); otherwise throw new AppUnknownException(err).',
};

/** The unexported module-level function, refused in favor of a method or a class. */
const moduleFunctionRestriction = {
    selector:
        'Program > FunctionDeclaration:not([id.name="bootstrap"]), Program > VariableDeclaration > VariableDeclarator > :matches(ArrowFunctionExpression, FunctionExpression).init',
    message:
        'No module-level function; fold it into the method or class that uses it.',
};

/** The regex source that matches a context type name. */
const contextTypeName = '/^I[A-Za-z]+Context$/';

/** The selector of a parameter typed as a context. */
const contextParam = `:matches([typeAnnotation.typeAnnotation.typeName.name=${contextTypeName}], [typeAnnotation.typeAnnotation.types.0.typeName.name=${contextTypeName}])`;

/** The parameter order: tx first, then the context parameters. */
const parameterOrderRestrictions = [
    {
        selector: ':function > Identifier.params[name="tx"]:not(:first-child)',
        message: 'tx is the first parameter.',
    },
    {
        selector: `:function > Identifier.params:not(${contextParam}):not([name="tx"]) ~ Identifier.params${contextParam}`,
        message:
            'A context parameter comes before every other parameter but tx.',
    },
];

/** The request.user read, refused in favor of the request store or context. */
const requestUserRestriction = {
    selector:
        'MemberExpression[property.name="user"]:matches([object.name=/^(request|req)$/], [object.callee.property.name="getRequest"])',
    message:
        'Read identity from the request store or the request context, never request.user.',
};

/** Every code style syntax restriction, shared by each src scope. */
const codeStyleRestrictedSyntax = [
    ...thisCallRestrictions,
    ...undefinedSyntaxRestrictions,
    forEachRestriction,
    moduleFunctionRestriction,
    requestUserRestriction,
    ...parameterOrderRestrictions,
    newDateRestriction,
    throwNewErrorRestriction,
    throwIdentifierRestriction,
];

/** Restricted syntax, layers: one no-restricted-syntax block per file scope, a later scope winning. */

/** The databaseService.client read, refused outside a repository, a seed, a health indicator, and src/common/database. */
const databaseClientRestriction = {
    selector:
        "MemberExpression[property.name='client'][object.type='MemberExpression'][object.property.name='databaseService']",
    message:
        'Only a repository, a seed, or a health indicator queries databaseService.client; a service or use case calls withTransaction and a repository.',
};

/** The $transaction call, refused in favor of DatabaseService.withTransaction. */
const transactionCallRestriction = {
    selector: "CallExpression[callee.property.name='$transaction']",
    message:
        'Open a transaction through DatabaseService.withTransaction, never $transaction.',
};

/** The @Inject of a queue enum, refused in favor of the queue class. */
const injectQueueRestriction = {
    selector:
        "Decorator[expression.callee.name='Inject'][expression.arguments.0.type='MemberExpression'][expression.arguments.0.object.name=/^Enum[A-Za-z]+Queue$/]",
    message: 'Inject a queue class by its class, never @Inject(<queue enum>).',
};

/** The withTransaction call, refused outside a use case in src/modules. */
const withTransactionRestriction = {
    selector: "CallExpression[callee.property.name='withTransaction']",
    message:
        'Only a use case opens a transaction in src/modules: call withTransaction from the use case.',
};

/** The call of a BullMQ Queue method, refused outside the queue classes, the queue bases, and the queue health indicator. */
const queueMethodRestriction = {
    selector:
        "CallExpression[callee.object.type='MemberExpression'][callee.object.object.type='ThisExpression'][callee.object.property.name='queue']",
    message:
        'Only a queue class, a queue base, and the queue health indicator call a method of the BullMQ Queue: go through the queue class.',
};

/** The call of a BullMQ scheduler method, refused in a queues/ file and the queue health indicator: QueueBase alone schedules. */
const queueSchedulerCallRestriction = {
    selector:
        'CallExpression[callee.property.name=/^(upsertJobScheduler|getJobSchedulers|removeJobScheduler)$/]',
    message:
        'A queue class does not call a job scheduler method: declare its recurring jobs in schedulers().',
};

/** The onModuleInit method, refused in a queues/ file: QueueBase alone declares it. */
const queueOnModuleInitRestriction = {
    selector: 'MethodDefinition[key.name="onModuleInit"]',
    message:
        'A queue class declares no onModuleInit: declare its recurring jobs in schedulers().',
};

/** The no-restricted-syntax block of each file scope, in override order. */
const restrictedSyntaxScopes = [
    [
        'ts/syntax-kit',
        ['src/*.ts', 'src/!(modules)/**/*.ts'],
        [
            databaseClientRestriction,
            transactionCallRestriction,
            queueMethodRestriction,
        ],
    ],
    [
        'ts/syntax-modules',
        ['src/modules/**/*.ts'],
        [
            databaseClientRestriction,
            transactionCallRestriction,
            injectQueueRestriction,
            withTransactionRestriction,
            queueMethodRestriction,
        ],
    ],
    [
        'ts/syntax-use-case',
        ['src/modules/*/use-cases/**/*.ts'],
        [
            databaseClientRestriction,
            transactionCallRestriction,
            injectQueueRestriction,
            queueMethodRestriction,
        ],
    ],
    [
        'ts/syntax-module-database-client',
        [
            'src/modules/*/repositories/**/*.ts',
            'src/modules/health/indicators/**/*.ts',
        ],
        [
            transactionCallRestriction,
            injectQueueRestriction,
            withTransactionRestriction,
            queueMethodRestriction,
        ],
    ],
    [
        'ts/syntax-module-queue',
        ['src/modules/*/queues/**/*.ts'],
        [
            databaseClientRestriction,
            transactionCallRestriction,
            injectQueueRestriction,
            withTransactionRestriction,
            queueSchedulerCallRestriction,
            queueOnModuleInitRestriction,
        ],
    ],
    [
        'ts/syntax-queue-indicator',
        ['src/modules/health/indicators/health.queue.indicator.ts'],
        [
            transactionCallRestriction,
            injectQueueRestriction,
            withTransactionRestriction,
            queueSchedulerCallRestriction,
        ],
    ],
    [
        'ts/syntax-kit-database-client',
        [
            'src/common/**/repositories/**/*.ts',
            'src/common/database/**/*.ts',
            'src/migration/**/*.ts',
        ],
        [transactionCallRestriction, queueMethodRestriction],
    ],
    [
        'ts/syntax-database-service',
        ['src/common/database/services/database.service.ts'],
        [queueMethodRestriction],
    ],
    [
        'ts/syntax-kit-queue',
        ['src/common/**/queues/**/*.ts'],
        [
            databaseClientRestriction,
            transactionCallRestriction,
            queueSchedulerCallRestriction,
            queueOnModuleInitRestriction,
        ],
    ],
    [
        'ts/syntax-kit-queue-base',
        ['src/common/queue/bases/**/*.ts'],
        [databaseClientRestriction, transactionCallRestriction],
    ],
].map(([name, files, restrictions]) => ({
    name,
    files,
    rules: {
        'no-restricted-syntax': [
            'error',
            ...codeStyleRestrictedSyntax,
            ...restrictions,
        ],
    },
}));

/** Module boundaries: the element types, file categories, and layer policies of eslint-plugin-boundaries. */

/** The element types of a feature module, most specific first. */
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
    capture: ['module'],
}));

/** The module name captured from the importing file. */
const ownModule = '{{ from.element.captured.module }}';

/** The @Global() module names joined as a match alternation. */
const globalModuleSet = globalModules.join('|');

/** The match of every module but the importing one and the names given. */
const otherModule = (...also) => `!(${[ownModule, ...also].join('|')})`;

/** The layer matrix: what each element type, file category, or file path refuses to import. */
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
        from: { element: { type: 'controller' } },
        disallow: {
            to: {
                element: {
                    types: [
                        'service',
                        'repository',
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
        disallow: [
            {
                to: {
                    element: {
                        types: [
                            'service',
                            'repository',
                            'cache',
                            'queue',
                            'use-case',
                            'util',
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
            'A util is pure shaping: no service, repository, cache, queue class, use case, src/modules util, controller, processor, guard, decorator, interceptor, factory, indicator, or module file.',
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
        from: { element: { type: 'processor' } },
        disallow: [
            {
                to: {
                    element: {
                        types: [
                            'service',
                            'repository',
                            'util',
                            'cache',
                            'queue',
                        ],
                    },
                },
            },
            { to: { file: { categories: ['module', 'use-case-module'] } } },
        ],
        message:
            'A processor calls the use cases of its own feature only, never a service, a repository, a util, a cache, a queue class, or a module file.',
    },
    {
        from: { file: { categories: ['module', 'use-case-module'] } },
        disallow: { to: { file: { categories: ['use-case-module'] } } },
        message:
            'Only src/router/ imports a use-case module; a feature module and a use-case module import none.',
    },
    {
        from: {
            element: {
                type: 'service',
                captured: { module: `!(${globalModuleSet})` },
            },
        },
        disallow: {
            to: {
                element: {
                    type: 'service',
                    captured: { module: otherModule(...globalModules) },
                },
            },
        },
        message:
            'A service of a plain module injects no service of another plain module: sequence the two in a use case.',
    },
    {
        from: {
            element: {
                type: 'service',
                captured: { module: `@(${globalModuleSet})` },
            },
        },
        disallow: {
            to: {
                element: {
                    type: 'service',
                    captured: { module: otherModule() },
                },
            },
        },
        message:
            'A service of a @Global() module injects no service of another feature module: sequence the two in a use case.',
    },
    {
        from: { element: { types: { noneOf: ['use-case'] } } },
        disallow: {
            to: {
                element: {
                    type: 'util',
                    captured: { module: otherModule() },
                },
            },
        },
        message:
            'A feature util is imported by its own module and by use cases only.',
    },
    {
        from: {
            file: { path: 'src/modules/*/use-cases/*.process-*.use-case.ts' },
        },
        disallow: {
            to: {
                element: {
                    type: 'queue',
                    captured: { module: '!(notification|activity-log)' },
                },
            },
        },
        message:
            'A process use case imports a queue class only from src/common, the notification module, and the activity-log module.',
    },
];

/** Test restrictions: the syntax every test file refuses, and what a spec refuses beyond it. */

/** The syntax every file under test/ refuses. */
const testSyntaxRestrictions = [
    {
        selector:
            'MemberExpression[property.name="mock"]:not([object.name="vi"])',
        message:
            'Assert through toHaveBeenCalledWith and friends, not fn.mock.*',
    },
    {
        selector: 'ClassDeclaration, ClassExpression',
        message:
            'A spec declares no class; apply the decorator to a plain object and read the metadata',
    },
    forEachRestriction,
];

/** The syntax a spec file refuses beyond every test file: functions outside the allowed arrow positions. */
const specSyntaxRestrictions = [
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
];

/** Rule sets the config blocks spread. */

/** The typescript-eslint recommended rules merged into one set. */
const recommendedRules = tsEslint.configs.recommended
    .map(config => config.rules)
    .filter(ruleSet => ruleSet !== undefined)
    .reduce((a, b) => ({ ...b, ...a }), {});

/** The security plugin rules, every one at error but detect-object-injection. */
const securityRules = {
    ...Object.fromEntries(
        Object.keys(security.configs.recommended.rules).map(rule => [
            rule,
            'error',
        ])
    ),
    'security/detect-object-injection': 'off',
};

/** The rules that need type information: promises and exhaustiveness. */
const typedLintRules = {
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
};

/** The comment rules: the note, xxx, and hack markers and the JSDoc tags refused, no inline comment. */
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

/** The naming convention of every identifier kind. */
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

/** The import and statement ordering rules. */
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

/** The code quality rules of src/. */
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
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': 'warn',
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
    curly: ['error', 'all'],
};

/** The code style rules of src/ that hold no syntax selector. */
const codeStyleRules = {
    'no-restricted-properties': ['error', processEnvRestriction],
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
};

/** Inline plugin: the project rules ESLint has no built-in for. */

/** The class member node types whose leading comment the public-tag rule reads. */
const classMemberTypes = [
    'MethodDefinition',
    'PropertyDefinition',
    'TSAbstractMethodDefinition',
    'AccessorProperty',
];

/** The plugin `local`: a class member carries no `@public` tag, an export does. */
const localPlugin = {
    rules: {
        'no-public-tag-on-class-member': {
            meta: {
                type: 'problem',
                schema: [],
                messages: {
                    publicTag:
                        'A class member carries no @public tag: remove it, the tag applies to an export only.',
                },
            },
            create: context => {
                const { sourceCode } = context;
                const check = node => {
                    const tagged = sourceCode
                        .getCommentsBefore(node)
                        .some(
                            comment =>
                                comment.type === 'Block' &&
                                comment.value.startsWith('*') &&
                                comment.value.includes('@public')
                        );
                    if (tagged) {
                        context.report({ node, messageId: 'publicTag' });
                    }
                };

                return Object.fromEntries(
                    classMemberTypes.map(type => [type, check])
                );
            },
        },
    },
};

/** The rules src/ files and test/ files both apply. */
const sharedRules = {
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
    'no-restricted-imports': restrictedImportsRule,
    'no-restricted-globals': ['error', ...numberGlobalRestrictions],
    ...commentRules,
    ...namingConventionRules,
    'local/no-public-tag-on-class-member': 'error',
};

/** The language options of a typed-lint block. */
const typedLanguageOptions = {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parser: tsParser,
    parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
    },
};

/** The linter options of a typed-lint block: no inline directive, no unused directive. */
const strictLinterOptions = {
    noInlineConfig: true,
    reportUnusedDisableDirectives: 'error',
};

/** Config blocks, in override order: a later block wins for the files it matches. */

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
        languageOptions: typedLanguageOptions,
        linterOptions: strictLinterOptions,
        plugins: {
            '@typescript-eslint': tsEsLintPlugin,
            local: localPlugin,
            security,
        },
        rules: {
            ...recommendedRules,
            ...codeQualityRules,
            ...typedLintRules,
            ...securityRules,
            ...importOrderRules,
            ...codeStyleRules,
            ...sharedRules,
        },
    },
    ...restrictedSyntaxScopes,
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
        files: ['src/configs/**/*.ts', 'src/bootstrap.ts', 'src/instrument.ts'],
        rules: {
            'no-restricted-properties': 'off',
        },
    },
    {
        name: 'ts/other',
        files: ['scripts/**/*.ts', 'vitest.config.ts'],
        languageOptions: typedLanguageOptions,
        linterOptions: strictLinterOptions,
        plugins: {
            '@typescript-eslint': tsEsLintPlugin,
        },
        rules: {
            ...recommendedRules,
            ...typedLintRules,
        },
    },
    {
        name: 'ts/test',
        files: ['test/**/*.ts'],
        languageOptions: typedLanguageOptions,
        linterOptions: strictLinterOptions,
        plugins: {
            '@typescript-eslint': tsEsLintPlugin,
            local: localPlugin,
        },
        rules: {
            ...recommendedRules,
            ...typedLintRules,
            ...sharedRules,
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/ban-ts-comment': [
                'error',
                {
                    'ts-expect-error': true,
                    'ts-ignore': true,
                    'ts-nocheck': true,
                    'ts-check': false,
                },
            ],
            'no-restricted-syntax': ['error', ...testSyntaxRestrictions],
        },
    },
    {
        name: 'ts/test-spec',
        files: ['test/**/*.spec.ts'],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...testSyntaxRestrictions,
                ...specSyntaxRestrictions,
            ],
        },
    },
];
