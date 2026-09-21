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
        setupFiles: ['test/setup.ts'],
        isolate: false,
        fsModuleCache: true,
        testTimeout: 5000,
        passWithNoTests: true,
        include: ['test/**/*.spec.ts'],
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
                'src/**/*.doc.ts',
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
    },
});
