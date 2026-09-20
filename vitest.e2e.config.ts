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
        include: ['test/**/*.e2e-spec.ts'],
        exclude: ['**/node_modules/**', '**/dist/**'],
        setupFiles: ['test/setup.ts', 'test/e2e/setup.ts'],
        testTimeout: 30000,
        hookTimeout: 60000,
        pool: 'forks',
        isolate: true,
    },
});
