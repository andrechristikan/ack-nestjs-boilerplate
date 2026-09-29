import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseClientToken } from '@common/database/constants/database.constant';
import { DatabaseClientFactory } from '@common/database/factories/database.client.factory';
import { DatabaseService } from '@common/database/services/database.service';
import type { IDatabaseClient } from '@common/database/interfaces/database.client.interface';
import type { Prisma } from '@generated/prisma-client/client';

describe('DatabaseService', () => {
    const client: MockProxy<IDatabaseClient> = mock<IDatabaseClient>();
    const databaseClientFactory: MockProxy<DatabaseClientFactory> =
        mock<DatabaseClientFactory>();
    const configGet = vi.fn<(key: string) => boolean | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let service: DatabaseService;

    const build = async (
        values: Record<string, boolean>
    ): Promise<DatabaseService> => {
        configGet.mockImplementation((key: string) => values[key]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DatabaseService,
                { provide: ConfigService, useValue: configService },
                {
                    provide: DatabaseClientFactory,
                    useValue: databaseClientFactory,
                },
                { provide: DatabaseClientToken, useValue: client },
            ],
        }).compile();

        return module.get(DatabaseService);
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        service = await build({
            'database.debug': true,
            'logger.prettier': true,
        });
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
            const offService = await build({
                'database.debug': false,
                'logger.prettier': true,
            });
            client.$connect.mockResolvedValue(undefined);

            await offService.onModuleInit();

            expect(databaseClientFactory.$on).not.toHaveBeenCalled();
            expect(client.$connect).toHaveBeenCalledTimes(1);
        });

        it('rethrows when the connection fails', async () => {
            const error = new Error('connect failed');
            client.$connect.mockRejectedValue(error);

            await expect(service.onModuleInit()).rejects.toThrow(error);
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
            const tx = mock<IDatabaseClient>();
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
        it('connects the client and logs success', async () => {
            client.$connect.mockResolvedValue(undefined);

            await expect(service['connect']()).resolves.toBeUndefined();
            expect(client.$connect).toHaveBeenCalledTimes(1);
        });

        it('logs and rethrows when the connection fails', async () => {
            const error = new Error('connect failed');
            client.$connect.mockRejectedValue(error);

            await expect(service['connect']()).rejects.toThrow(error);
        });
    });

    describe('disconnect', () => {
        it('disconnects the client and logs success', async () => {
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
            const offService = await build({
                'database.debug': false,
                'logger.prettier': true,
            });

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
            const rawService = await build({
                'database.debug': true,
                'logger.prettier': false,
            });

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
