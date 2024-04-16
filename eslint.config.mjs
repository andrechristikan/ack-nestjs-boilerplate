import eslintConfigPrettier from 'eslint-config-prettier';
import tsEsLintPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import tsEslint from 'typescript-eslint';

const rules = tsEslint.configs.recommended
    .map(config => config.rules)
    .filter(rules => rules !== undefined)
    .reduce((a, b) => ({ ...b, ...a }), {});

export default [
    eslintConfigPrettier,
    {
        ignores: [
            '.github/*',
            '.husky/*',
            'coverage/*',
            'data/*',
            'dist/*',
            'docs/*',
            'logs/*',
            'node_modules/*',
        ],
    },
    {
        name: 'ts/default',
        files: ['src/**/*.{ts,tsx}', 'test/**/*.{ts,tsx}'],
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
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
];
