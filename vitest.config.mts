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
        include: ['test/**/*.spec.ts'],
        exclude: ['**/node_modules/**', '**/dist/**'],
        testTimeout: 5000,
        pool: 'forks',
        isolate: true,
        coverage: {
            provider: 'v8',
            reportsDirectory: 'coverage',
            reporter: ['text', 'html', 'lcov', 'json-summary'],
            include: [
                'src/{app,common,modules,queues}/**/bases/**/*.ts',
                'src/{app,common,modules,queues}/**/decorators/**/*.ts',
                'src/{app,common,modules,queues}/**/dtos/**/*.ts',
                'src/{app,common,modules,queues}/**/exceptions/**/*.ts',
                'src/{app,common,modules,queues}/**/factories/**/*.ts',
                'src/{app,common,modules,queues}/**/filters/**/*.ts',
                'src/{app,common,modules,queues}/**/guards/**/*.ts',
                'src/{app,common,modules,queues}/**/indicators/**/*.ts',
                'src/{app,common,modules,queues}/**/interceptors/**/*.ts',
                'src/{app,common,modules,queues}/**/middlewares/**/*.ts',
                'src/{app,common,modules,queues}/**/pipes/**/*.ts',
                'src/{app,common,modules,queues}/**/processors/**/*.ts',
                'src/{app,common,modules,queues}/**/{caches,domains,services}/**/*.ts',
                'src/{app,common,modules,queues}/**/strategies/**/*.ts',
                'src/{app,common,modules,queues}/**/utils/**/*.ts',
                'src/{app,common,modules,queues}/**/validations/**/*.ts',
                'src/{app,common,modules,queues}/**/validators/**/*.ts',
            ],
        },
    },
});
