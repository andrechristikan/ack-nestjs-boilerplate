import { mock } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseClientFactory } from '@common/database/factories/database.client.factory';
import { DatabaseService } from '@common/database/services/database.service';
import type { IDatabaseClient } from '@common/database/interfaces/database.client.interface';
import type { Prisma } from '@generated/prisma-client/client';
import { createDatabaseService } from '@test/unit/helpers/test.unit.database.helper';

describe('DatabaseService', () => {
    const client: MockProxy<IDatabaseClient> = mock<IDatabaseClient>();
    const databaseClientFactory: MockProxy<DatabaseClientFactory> =
        mock<DatabaseClientFactory>();
    let service: DatabaseService;

    beforeEach(async () => {
        vi.resetAllMocks();

        service = await createDatabaseService(
            {
                'database.debug': true,
                'logger.prettier': true,
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

        it('skips subscribing to log events when debug mode is off', async () => {
            const offService = await createDatabaseService(
                {
                    'database.debug': false,
                    'logger.prettier': true,
                },
                databaseClientFactory,
                client
            );
            client.$connect.mockResolvedValue(undefined);

            await offService.onModuleInit();

            expect(databaseClientFactory.$on).not.toHaveBeenCalled();
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

        it('wraps a failed connection once in AppUnknownException', async () => {
            const error = new Error('connect failed');
            client.$connect.mockRejectedValue(error);

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

        it('skips subscribing to log events when debug mode is off', async () => {
            const offService = await createDatabaseService(
                {
                    'database.debug': false,
                    'logger.prettier': true,
                },
                databaseClientFactory,
                client
            );

            await offService['setupLogging']();

            expect(databaseClientFactory.$on).not.toHaveBeenCalled();
        });
    });

    describe('logQuery', () => {
        const baseEvent: Prisma.QueryEvent = {
            timestamp: new Date(),
            query: 'SELECT * FROM "User" WHERE 1=1',
            params: '[]',
            duration: 10,
            target: 'quaint::pooled',
        };

        it('unescapes and collapses the query when prettier mode is on, below the slow-query threshold, with empty params', () => {
            expect(() =>
                service['logQuery']({
                    ...baseEvent,
                    query: 'SELECT \\"a\\"   FROM\\n"User" WHERE x = \\\\1',
                    params: '[]',
                    duration: 10,
                })
            ).not.toThrow();
        });

        it('appends params to the prettified message when they are not the empty array', () => {
            expect(() =>
                service['logQuery']({ ...baseEvent, params: '["a"]' })
            ).not.toThrow();
        });

        it('flags a query over one second as slow', () => {
            expect(() =>
                service['logQuery']({ ...baseEvent, duration: 1500 })
            ).not.toThrow();
        });

        it('logs the raw query when prettier mode is off', async () => {
            const rawService = await createDatabaseService(
                {
                    'database.debug': true,
                    'logger.prettier': false,
                },
                databaseClientFactory,
                client
            );

            expect(() =>
                rawService['logQuery']({ ...baseEvent, params: '["a"]' })
            ).not.toThrow();
        });

        it('skips sanitizing a query event whose query is not a string', () => {
            expect(() =>
                service['logQuery']({
                    ...baseEvent,
                    query: 123 as unknown as string,
                })
            ).not.toThrow();
        });
    });

    describe('logError', () => {
        it('logs a Prisma error event', () => {
            expect(() =>
                service['logError']({
                    timestamp: new Date(),
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
                    timestamp: new Date(),
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
                    timestamp: new Date(),
                    message: 'starting',
                    target: 'quaint::pooled',
                })
            ).not.toThrow();
        });
    });
});
