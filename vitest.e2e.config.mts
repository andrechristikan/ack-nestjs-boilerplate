import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [
        swc.vite({
            include: [/\.ts$/],
            module: { type: 'es6' },
        }),
    ],
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        root: '.',
        environment: 'node',
        globals: false,
        include: ['test/**/*.e2e-spec.ts'],
        exclude: ['**/node_modules/**', '**/dist/**'],
        setupFiles: ['test/e2e/setup.ts'],
        testTimeout: 30000,
        hookTimeout: 60000,
        pool: 'forks',
        isolate: true,
    },
});
