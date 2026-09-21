import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { mock, mockDeep } from 'vitest-mock-extended';
import type { DeepMockProxy, MockProxy } from 'vitest-mock-extended';
import { DatabaseClientToken } from '@common/database/constants/database.constant';
import { DatabaseClientFactory } from '@common/database/factories/database.client.factory';
import type {
    IDatabaseClient,
    IDatabaseTransactionClient,
} from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { Prisma } from '@generated/prisma-client/client';

describe('DatabaseService', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const configGet = vi.mocked(configService.get);
    const databaseClientFactory: MockProxy<DatabaseClientFactory> =
        mock<DatabaseClientFactory>();
    const client: DeepMockProxy<IDatabaseClient> = mockDeep<IDatabaseClient>();
    let service: DatabaseService;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => {
            if (key === 'database.debug') return true;
            if (key === 'logger.prettier') return true;
            return undefined;
        });

        const moduleRef: TestingModule = await Test.createTestingModule({
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

        service = moduleRef.get(DatabaseService);
    });

    describe('onModuleInit', () => {
        it('registers event handlers before connecting in debug mode', async () => {
            const calls: string[] = [];
            databaseClientFactory.$on.mockImplementation(() => {
                calls.push('logging');
                return databaseClientFactory;
            });
            client.$connect.mockImplementation(async () => {
                calls.push('connect');
            });

            await service.onModuleInit();

            expect(databaseClientFactory.$on).toHaveBeenCalledTimes(4);
            expect(databaseClientFactory.$on).toHaveBeenNthCalledWith(
                1,
                'query',
                expect.any(Function)
            );
            expect(databaseClientFactory.$on).toHaveBeenNthCalledWith(
                2,
                'error',
                expect.any(Function)
            );
            expect(databaseClientFactory.$on).toHaveBeenNthCalledWith(
                3,
                'warn',
                expect.any(Function)
            );
            expect(databaseClientFactory.$on).toHaveBeenNthCalledWith(
                4,
                'info',
                expect.any(Function)
            );
            expect(calls).toEqual([
                'logging',
                'logging',
                'logging',
                'logging',
                'connect',
            ]);
        });

        it('rethrows connection failures', async () => {
            const error = new Error('connect failed');
            client.$connect.mockRejectedValue(error);

            await expect(service.onModuleInit()).rejects.toBe(error);
        });
    });

    describe('onModuleDestroy', () => {
        it('disconnects and swallows shutdown failures', async () => {
            await expect(service.onModuleDestroy()).resolves.toBeUndefined();
            expect(client.$disconnect).toHaveBeenCalledTimes(1);

            client.$disconnect.mockRejectedValueOnce(
                new Error('disconnect failed')
            );
            await expect(service.onModuleDestroy()).resolves.toBeUndefined();
        });
    });

    describe('withTransaction', () => {
        it('runs the callback on the transaction client with options', async () => {
            const tx = mock<IDatabaseTransactionClient>();
            client.$transaction.mockImplementation(async callback =>
                callback(tx)
            );
            const callback = vi.fn(async () => 'done');
            const options = { maxWait: 100, timeout: 200 };

            await expect(
                service.withTransaction(callback, options)
            ).resolves.toBe('done');
            expect(callback).toHaveBeenCalledWith(tx);
            expect(client.$transaction).toHaveBeenCalledWith(
                expect.any(Function),
                options
            );
        });
    });

    describe('connect', () => {
        it('connects successfully and rethrows failures', async () => {
            await expect(service['connect']()).resolves.toBeUndefined();
            const error = new Error('failed');
            client.$connect.mockRejectedValueOnce(error);
            await expect(service['connect']()).rejects.toBe(error);
        });
    });

    describe('disconnect', () => {
        it('disconnects successfully and swallows failures', async () => {
            await expect(service['disconnect']()).resolves.toBeUndefined();
            client.$disconnect.mockRejectedValueOnce(new Error('failed'));
            await expect(service['disconnect']()).resolves.toBeUndefined();
        });
    });

    describe('setupLogging', () => {
        it('does not register event handlers outside debug mode', async () => {
            configGet.mockImplementation((key: string) => {
                if (key === 'database.debug') return false;
                if (key === 'logger.prettier') return false;
                return undefined;
            });
            const moduleRef: TestingModule = await Test.createTestingModule({
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
            const nonDebugService = moduleRef.get(DatabaseService);

            await nonDebugService['setupLogging']();

            expect(databaseClientFactory.$on).not.toHaveBeenCalled();
        });
    });

    describe('logQuery', () => {
        it('handles pretty queries, empty params, and slow queries', () => {
            service['logQuery']({
                timestamp: new Date('2026-01-01T00:00:00.000Z'),
                query: '\\"SELECT  \\n value\\\\path\\"',
                params: '[1]',
                duration: 1001,
                target: 'mongodb',
            });
            service['logQuery']({
                timestamp: new Date('2026-01-01T00:00:00.000Z'),
                query: 'SELECT 1',
                params: '[]',
                duration: 1,
                target: 'mongodb',
            });
        });

        it('handles plain queries when pretty formatting is disabled', async () => {
            configGet.mockImplementation((key: string) => {
                if (key === 'database.debug') return true;
                if (key === 'logger.prettier') return false;
                return undefined;
            });
            const moduleRef: TestingModule = await Test.createTestingModule({
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
            const plainService = moduleRef.get(DatabaseService);

            plainService['logQuery']({
                timestamp: new Date('2026-01-01T00:00:00.000Z'),
                query: 'SELECT 1',
                params: '[]',
                duration: 1,
                target: 'mongodb',
            });
            service['logQuery']({
                timestamp: new Date('2026-01-01T00:00:00.000Z'),
                query: 42,
                params: '[]',
                duration: 1,
                target: 'mongodb',
            } as unknown as Prisma.QueryEvent);
        });
    });

    describe('logError', () => {
        it('accepts Prisma error, warning, and info events', () => {
            const event: Prisma.LogEvent = {
                timestamp: new Date('2026-01-01T00:00:00.000Z'),
                message: 'event',
                target: 'mongodb',
            };
            service['logError'](event);
            service['logWarn'](event);
            service['logInfo'](event);
        });
    });
});
