import { mock } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseClientFactory } from '@common/database/factories/database.client.factory';
import { DatabaseService } from '@common/database/services/database.service';
import type { IDatabaseClient } from '@common/database/interfaces/database.client.interface';
import type { Prisma } from '@generated/prisma-client/client';
import { createDatabaseService } from '@test/unit/helpers/test.unit.database.helper';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';

describe('DatabaseService', () => {
    const client: MockProxy<IDatabaseClient> = mock<IDatabaseClient>();
    const databaseClientFactory: MockProxy<DatabaseClientFactory> =
        mock<DatabaseClientFactory>();
    let service: DatabaseService;

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        service = await createDatabaseService(
            {
                'database.debugEnabled': true,
                'database.slowQueryThresholdInMs': 500,
            },
            databaseClientFactory,
            client
        );
    });

    describe('onModuleInit', () => {
        it('subscribes to every Prisma log event and connects when debug mode is on', async () => {
            client.$connect.mockResolvedValue(undefined);

            await service.onModuleInit();

            expect(databaseClientFactory.$on).toHaveBeenCalledWith(
                'query',
                expect.any(Function)
            );
            expect(databaseClientFactory.$on).toHaveBeenCalledWith(
                'error',
                expect.any(Function)
            );
            expect(databaseClientFactory.$on).toHaveBeenCalledWith(
                'warn',
                expect.any(Function)
            );
            expect(databaseClientFactory.$on).toHaveBeenCalledWith(
                'info',
                expect.any(Function)
            );
            expect(client.$connect).toHaveBeenCalledTimes(1);
        });

        it('subscribes to the query event only when debug mode is off', async () => {
            const offService = await createDatabaseService(
                {
                    'database.debugEnabled': false,
                    'database.slowQueryThresholdInMs': 500,
                },
                databaseClientFactory,
                client
            );
            client.$connect.mockResolvedValue(undefined);

            await offService.onModuleInit();

            expect(databaseClientFactory.$on).toHaveBeenCalledTimes(1);
            expect(databaseClientFactory.$on).toHaveBeenCalledWith(
                'query',
                expect.any(Function)
            );
            expect(client.$connect).toHaveBeenCalledTimes(1);
        });

        it('wraps a failure while subscribing to log events in AppUnknownException', async () => {
            const error = new Error('subscribe failed');
            databaseClientFactory.$on.mockImplementation(() => {
                throw error;
            });

            await expect(service.onModuleInit()).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
                message: 'Initializing the database service failed',
            });
            expect(client.$connect).not.toHaveBeenCalled();
        });

        it('wraps a failed connection once in AppUnknownException and sends no ping', async () => {
            const error = new Error('connect failed');
            client.$connect.mockRejectedValue(error);

            await expect(service.onModuleInit()).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
                message: 'Connecting to the database failed',
            });
            expect(client.$runCommandRaw).not.toHaveBeenCalled();
        });

        it('pings the database after connecting', async () => {
            client.$connect.mockResolvedValue(undefined);
            client.$runCommandRaw.mockResolvedValue({ ok: 1 });

            await service.onModuleInit();

            expect(client.$runCommandRaw).toHaveBeenCalledWith({ ping: 1 });
            expect(client.$connect).toHaveBeenCalledBefore(
                client.$runCommandRaw
            );
        });

        it('wraps a failed ping once in AppUnknownException', async () => {
            const error = new Error('Server selection timeout');
            client.$connect.mockResolvedValue(undefined);
            client.$runCommandRaw.mockRejectedValue(error);

            await expect(service.onModuleInit()).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
                message: 'Connecting to the database failed',
            });
        });
    });

    describe('onModuleDestroy', () => {
        it('disconnects the client', async () => {
            client.$disconnect.mockResolvedValue(undefined);

            await service.onModuleDestroy();

            expect(client.$disconnect).toHaveBeenCalledTimes(1);
        });

        it('swallows a disconnect failure instead of throwing', async () => {
            client.$disconnect.mockRejectedValue(
                new Error('disconnect failed')
            );

            await expect(service.onModuleDestroy()).resolves.toBeUndefined();
        });
    });

    describe('withTransaction', () => {
        it('runs fn on the tx-bound client through $transaction', async () => {
            const tx: MockProxy<IDatabaseClient> = mock<IDatabaseClient>();
            client.$transaction.mockImplementation(async (fn: unknown) =>
                (fn as (tx: IDatabaseClient) => Promise<unknown>)(tx)
            );
            const fn = vi.fn().mockResolvedValue('result');

            const result = await service.withTransaction(fn as never);

            expect(fn).toHaveBeenCalledWith(tx);
            expect(client.$transaction).toHaveBeenCalledWith(
                expect.any(Function),
                undefined
            );
            expect(result).toBe('result');
        });

        it('forwards the given options to $transaction', async () => {
            client.$transaction.mockImplementation(async (fn: unknown) =>
                (fn as (tx: IDatabaseClient) => Promise<unknown>)(
                    mock<IDatabaseClient>()
                )
            );
            const fn = vi.fn().mockResolvedValue('result');
            const options = { maxWait: 1000, timeout: 2000 };

            await service.withTransaction(fn as never, options);

            expect(client.$transaction).toHaveBeenCalledWith(
                expect.any(Function),
                options
            );
        });
    });

    describe('afterCommit', () => {
        it('awaits the callbacks registered on the tx in registration order after $transaction resolves and returns the result after the last', async () => {
            const tx: MockProxy<IDatabaseClient> = mock<IDatabaseClient>();
            const committed = buildDeferred<void>();
            const firstDone = buildDeferred<void>();
            client.$transaction.mockImplementationOnce(async (fn: unknown) => {
                const result = await (
                    fn as (tx: IDatabaseClient) => Promise<unknown>
                )(tx);
                await committed.promise;

                return result;
            });
            const first = vi.fn().mockReturnValue(firstDone.promise);
            const second = vi.fn().mockResolvedValue(undefined);

            const body = vi
                .fn()
                .mockImplementation(async (innerTx: IDatabaseClient) => {
                    service.afterCommit(innerTx, first);
                    service.afterCommit(innerTx, second);

                    return 'result';
                });

            const pending = service.withTransaction(body);
            await vi.advanceTimersByTimeAsync(0);

            expect(first).not.toHaveBeenCalled();

            committed.resolve();
            await vi.advanceTimersByTimeAsync(0);

            expect(first).toHaveBeenCalledTimes(1);

            expect(second).not.toHaveBeenCalled();

            firstDone.resolve();
            const result = await pending;

            expect(second).toHaveBeenCalledTimes(1);
            expect(first).toHaveBeenCalledBefore(second);
            expect(result).toBe('result');
        });

        it('runs no callback and rethrows when $transaction rejects', async () => {
            const error = new Error('rolled back');
            client.$transaction.mockImplementationOnce(async (fn: unknown) => {
                await (fn as (tx: IDatabaseClient) => Promise<unknown>)(
                    mock<IDatabaseClient>()
                );

                throw error;
            });
            const callback = vi.fn().mockResolvedValue(undefined);

            const body = vi
                .fn()
                .mockImplementation(async (tx: IDatabaseClient) => {
                    service.afterCommit(tx, callback);
                });

            await expect(service.withTransaction(body)).rejects.toBe(error);
            expect(callback).not.toHaveBeenCalled();
        });

        it('runs no callback registered on another transaction tx', async () => {
            const txA: MockProxy<IDatabaseClient> = mock<IDatabaseClient>();
            const txB: MockProxy<IDatabaseClient> = mock<IDatabaseClient>();
            const heldOpen = buildDeferred<void>();
            client.$transaction
                .mockImplementationOnce(async (fn: unknown) =>
                    (fn as (tx: IDatabaseClient) => Promise<unknown>)(txA)
                )
                .mockImplementationOnce(async (fn: unknown) => {
                    const result = await (
                        fn as (tx: IDatabaseClient) => Promise<unknown>
                    )(txB);
                    await heldOpen.promise;

                    return result;
                });
            const callbackA = vi.fn().mockResolvedValue(undefined);
            const callbackB = vi.fn().mockResolvedValue(undefined);

            const bodyA = vi
                .fn()
                .mockImplementation(async (tx: IDatabaseClient) => {
                    service.afterCommit(tx, callbackA);
                });
            const bodyB = vi
                .fn()
                .mockImplementation(async (tx: IDatabaseClient) => {
                    service.afterCommit(tx, callbackB);
                });

            const first = service.withTransaction(bodyA);
            const second = service.withTransaction(bodyB);
            await first;

            expect(callbackA).toHaveBeenCalledTimes(1);
            expect(callbackB).not.toHaveBeenCalled();

            heldOpen.resolve();
            await second;

            expect(callbackB).toHaveBeenCalledTimes(1);
            expect(callbackA).toHaveBeenCalledTimes(1);
        });
    });

    describe('connect', () => {
        it('connects the client', async () => {
            client.$connect.mockResolvedValue(undefined);

            await expect(service['connect']()).resolves.toBeUndefined();
            expect(client.$connect).toHaveBeenCalledTimes(1);
        });

        it('wraps a failed connection in AppUnknownException', async () => {
            const error = new Error('connect failed');
            client.$connect.mockRejectedValue(error);

            await expect(service['connect']()).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: error,
                message: 'Connecting to the database failed',
            });
        });
    });

    describe('disconnect', () => {
        it('disconnects the client', async () => {
            client.$disconnect.mockResolvedValue(undefined);

            await expect(service['disconnect']()).resolves.toBeUndefined();
            expect(client.$disconnect).toHaveBeenCalledTimes(1);
        });

        it('logs and swallows a disconnect failure', async () => {
            client.$disconnect.mockRejectedValue(
                new Error('disconnect failed')
            );

            await expect(service['disconnect']()).resolves.toBeUndefined();
        });
    });

    describe('setupLogging', () => {
        it('subscribes to every Prisma log event when debug mode is on', async () => {
            await service['setupLogging']();

            expect(databaseClientFactory.$on).toHaveBeenCalledWith(
                'query',
                expect.any(Function)
            );
            expect(databaseClientFactory.$on).toHaveBeenCalledWith(
                'error',
                expect.any(Function)
            );
            expect(databaseClientFactory.$on).toHaveBeenCalledWith(
                'warn',
                expect.any(Function)
            );
            expect(databaseClientFactory.$on).toHaveBeenCalledWith(
                'info',
                expect.any(Function)
            );
        });

        it('subscribes to the query event only when debug mode is off', async () => {
            const offService = await createDatabaseService(
                {
                    'database.debugEnabled': false,
                    'database.slowQueryThresholdInMs': 500,
                },
                databaseClientFactory,
                client
            );

            await offService['setupLogging']();

            expect(databaseClientFactory.$on).toHaveBeenCalledTimes(1);
            expect(databaseClientFactory.$on).toHaveBeenCalledWith(
                'query',
                expect.any(Function)
            );
        });
    });

    describe('logQuery', () => {
        const event: Prisma.QueryEvent = {
            timestamp: new Date('2026-01-01T00:00:00.000Z'),
            query: 'db.User.find({ email: "jane@example.com" })',
            params: '["jane@example.com"]',
            duration: 1500,
            target: 'quaint::pooled',
        };

        it('does not throw for a slow event', () => {
            expect(() => service['logQuery'](event)).not.toThrow();
        });

        it('does not throw for a fast event when debug mode is on', () => {
            expect(() =>
                service['logQuery']({ ...event, duration: 12 })
            ).not.toThrow();
        });

        it('does not throw for a fast event when debug mode is off', async () => {
            const offService = await createDatabaseService(
                {
                    'database.debugEnabled': false,
                    'database.slowQueryThresholdInMs': 500,
                },
                databaseClientFactory,
                client
            );

            expect(() =>
                offService['logQuery']({ ...event, duration: 12 })
            ).not.toThrow();
        });
    });

    describe('describeQuery', () => {
        const baseEvent: Prisma.QueryEvent = {
            timestamp: new Date('2026-01-01T00:00:00.000Z'),
            query: 'db.User.aggregate([ { $match: { email: "jane@example.com" } } ])',
            params: '["jane@example.com"]',
            duration: 12,
            target: 'quaint::pooled',
        };

        it('marks a query at the threshold as slow and returns only the four keys', () => {
            expect(
                service['describeQuery']({ ...baseEvent, duration: 500 })
            ).toEqual({
                model: 'User',
                action: 'aggregate',
                duration: 500,
                isSlow: true,
            });
        });

        it('marks a query above the threshold as slow', () => {
            expect(
                service['describeQuery']({ ...baseEvent, duration: 501 }).isSlow
            ).toBe(true);
        });

        it('marks a query below the threshold as not slow', () => {
            expect(
                service['describeQuery']({ ...baseEvent, duration: 499 }).isSlow
            ).toBe(false);
        });

        it('returns a null model and action for a statement that names no collection', () => {
            expect(
                service['describeQuery']({
                    ...baseEvent,
                    query: 'BEGIN',
                })
            ).toEqual({
                model: null,
                action: null,
                duration: 12,
                isSlow: false,
            });
        });
    });

    describe('logError', () => {
        it('logs a Prisma error event', () => {
            expect(() =>
                service['logError']({
                    timestamp: new Date('2026-01-01T00:00:00.000Z'),
                    message: 'boom',
                    target: 'quaint::pooled',
                })
            ).not.toThrow();
        });
    });

    describe('logWarn', () => {
        it('logs a Prisma warning event', () => {
            expect(() =>
                service['logWarn']({
                    timestamp: new Date('2026-01-01T00:00:00.000Z'),
                    message: 'careful',
                    target: 'quaint::pooled',
                })
            ).not.toThrow();
        });
    });

    describe('logInfo', () => {
        it('logs a Prisma info event', () => {
            expect(() =>
                service['logInfo']({
                    timestamp: new Date('2026-01-01T00:00:00.000Z'),
                    message: 'starting',
                    target: 'quaint::pooled',
                })
            ).not.toThrow();
        });
    });
});
