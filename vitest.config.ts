import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [
        swc.vite({
            module: { type: 'nodenext' },
        }),
    ],
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        globals: true,
        environment: 'node',
        fsModuleCache: true,
        passWithNoTests: true,
        coverage: {
            enabled: false,
            provider: 'v8',
            reportsDirectory: './coverage',
            reporter: ['text', 'html', 'lcov', 'json-summary'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.module.ts',
                'src/**/*.enum.ts',
                'src/**/*.interface.ts',
                'src/**/*.constant.ts',
                'src/**/*.contract.ts',
                'src/**/*.controller.ts',
                'src/**/*.processor.ts',
                'src/**/*.repository.ts',
                'src/generated/**',
                'src/migration/**',
                'src/router/**',
                'src/configs/**',
                'src/languages/**',
                'src/*.ts',
            ],
            thresholds: {
                branches: 100,
                functions: 100,
                lines: 100,
                statements: 100,
            },
        },
        projects: [
            {
                extends: true,
                test: {
                    name: 'unit',
                    include: ['test/unit/**/*.spec.ts'],
                    setupFiles: ['test/helpers/test.logger.helper.ts'],
                    isolate: false,
                    testTimeout: 5000,
                    sequence: { groupOrder: 0 },
                },
            },
        ],
    },
});
