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
        include: ['test/e2e/**/*.e2e-spec.ts'],
        setupFiles: ['test/setup.ts', 'test/e2e/setup.ts'],
        testTimeout: 30000,
        hookTimeout: 60000,
        pool: 'forks',
        isolate: false,
        fileParallelism: false,
        coverage: {
            enabled: false,
            provider: 'v8',
            reportsDirectory: './coverage-e2e',
            reporter: ['text', 'html', 'lcov', 'json-summary'],
            include: ['src/**/*.controller.ts'],
        },
    },
});
