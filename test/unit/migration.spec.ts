import { AppBootstrapSentryFlushTimeoutInMs } from '@app/constants/app.constant';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { MockInstance } from 'vitest';
import {
    buildMigrationApp,
    loadFreshAppUnknownException,
    runMigration,
    stubMigrationBootstrap,
    stubProcessExit,
    stubServiceFailure,
    waitForExit,
} from '@test/unit/helpers/test.unit.migration.helper';
import type { IMigrationDoubles } from '@test/unit/helpers/test.unit.migration.helper';

const doubles: IMigrationDoubles = vi.hoisted(() => ({
    createWithoutRunning: vi.fn(),
    runApplication: vi.fn(),
    captureException: vi.fn(),
    flush: vi.fn(),
}));

vi.mock('nest-commander', () => ({
    CommandFactory: {
        createWithoutRunning: doubles.createWithoutRunning,
        runApplication: doubles.runApplication,
    },
}));
vi.mock('@migration/migration.module', () => ({ MigrationModule: {} }));
vi.mock('nestjs-pino', () => ({ Logger: vi.fn() }));
vi.mock('@sentry/nestjs', () => ({
    captureException: doubles.captureException,
    flush: doubles.flush,
}));

describe('migration', () => {
    let exit: MockInstance<typeof process.exit>;

    beforeEach(() => {
        vi.resetAllMocks();
        exit = stubProcessExit();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('creates the command app with a fatal-only logger and a service error handler', async () => {
        const app = buildMigrationApp();
        stubMigrationBootstrap(doubles, app);

        await loadFreshAppUnknownException();
        await runMigration();
        await waitForExit(exit, 0);

        expect(doubles.createWithoutRunning).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                abortOnError: false,
                bufferLogs: true,
                logger: ['fatal'],
                serviceErrorHandler: expect.any(Function),
            })
        );
    });

    it('closes the app and exits 0 when the command succeeds', async () => {
        const app = buildMigrationApp();
        stubMigrationBootstrap(doubles, app);

        await loadFreshAppUnknownException();
        await runMigration();
        await waitForExit(exit, 0);

        expect(doubles.runApplication).toHaveBeenCalledWith(app);
        expect(app.close).toHaveBeenCalledTimes(1);
        expect(doubles.captureException).not.toHaveBeenCalled();
    });

    it('reports a command failure to Sentry, flushes, and exits 1', async () => {
        const failure = new Error('seed failed');
        const captured = stubMigrationBootstrap(doubles, buildMigrationApp());
        stubServiceFailure(doubles, captured, failure);

        await loadFreshAppUnknownException();
        await runMigration();
        await waitForExit(exit, 1);

        expect(doubles.captureException).toHaveBeenCalledTimes(1);
        expect(doubles.captureException).toHaveBeenCalledWith(
            expect.objectContaining({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: failure,
                description: 'Running the migration command failed',
            })
        );
        expect(doubles.flush).toHaveBeenCalledWith(
            AppBootstrapSentryFlushTimeoutInMs
        );
    });

    it('reports a typed exception from a command as it is', async () => {
        const ExceptionClass = await loadFreshAppUnknownException();
        const failure = new ExceptionClass(
            new Error('cause'),
            'Seeding the roles failed'
        );
        const captured = stubMigrationBootstrap(doubles, buildMigrationApp());
        stubServiceFailure(doubles, captured, failure);

        await runMigration();
        await waitForExit(exit, 1);

        expect(doubles.captureException).toHaveBeenCalledWith(failure);
    });

    it('reports a module creation failure to Sentry and exits 1', async () => {
        const failure = new Error('module creation failed');
        stubMigrationBootstrap(doubles, buildMigrationApp());
        doubles.createWithoutRunning.mockRejectedValue(failure);

        await loadFreshAppUnknownException();
        await runMigration();
        await waitForExit(exit, 1);

        expect(doubles.captureException).toHaveBeenCalledWith(failure);
        expect(doubles.runApplication).not.toHaveBeenCalled();
    });
});
