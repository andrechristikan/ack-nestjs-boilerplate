import type { Mock, MockInstance } from 'vitest';
import type { AppUnknownException } from '@app/exceptions/app.unknown.exception';

export interface IMigrationApp {
    useLogger: Mock;
    flushLogs: Mock;
    get: Mock;
    close: Mock;
}

export interface IMigrationOptions {
    abortOnError: boolean;
    bufferLogs: boolean;
    logger: string[];
    serviceErrorHandler: (error: Error) => void;
}

export interface IMigrationDoubles {
    createWithoutRunning: Mock;
    runApplication: Mock;
    captureException: Mock;
    flush: Mock;
}

export type AppUnknownExceptionClass = typeof AppUnknownException;

export function buildMigrationApp(): IMigrationApp {
    return {
        useLogger: vi.fn(),
        flushLogs: vi.fn(),
        get: vi.fn(),
        close: vi.fn(),
    };
}

export function stubMigrationBootstrap(
    doubles: IMigrationDoubles,
    app: IMigrationApp
): { options: IMigrationOptions | null } {
    const captured: { options: IMigrationOptions | null } = { options: null };

    doubles.createWithoutRunning.mockImplementation(
        (_root: unknown, options: IMigrationOptions) => {
            captured.options = options;

            return Promise.resolve(app);
        }
    );
    doubles.runApplication.mockResolvedValue(app);
    doubles.flush.mockResolvedValue(true);

    return captured;
}

export function stubServiceFailure(
    doubles: IMigrationDoubles,
    captured: { options: IMigrationOptions | null },
    error: Error
): void {
    doubles.runApplication.mockImplementation(() => {
        captured.options?.serviceErrorHandler(error);

        return Promise.resolve();
    });
}

export async function loadFreshAppUnknownException(): Promise<AppUnknownExceptionClass> {
    vi.resetModules();
    const module = await import('@app/exceptions/app.unknown.exception');

    return module.AppUnknownException;
}

export async function runMigration(): Promise<void> {
    await import('@migration');
}

export async function waitForExit(
    exit: MockInstance<typeof process.exit>,
    code: number
): Promise<void> {
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(code));
}

export function stubProcessExit(): MockInstance<typeof process.exit> {
    return vi
        .spyOn(process, 'exit')
        .mockImplementation((() => 0) as typeof process.exit);
}
