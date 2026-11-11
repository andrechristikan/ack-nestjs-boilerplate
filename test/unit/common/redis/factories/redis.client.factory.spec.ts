import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { RedisClientFactory } from '@common/redis/factories/redis.client.factory';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

vi.mock('ioredis');

describe('RedisClientFactory', () => {
    const configValues: Record<string, unknown> = {
        'redis.cache.url': 'redis://cache',
        'redis.cache.namespace': 'Cache',
        'redis.commandTimeoutInMs': 2000,
        'redis.connectTimeoutInMs': 5000,
        'redis.queue.url': 'redis://queue',
        'redis.queue.connectTimeoutInMs': 5000,
        'redis.queue.maxRetriesPerRequest': 1,
        'app.name': 'ack',
        'app.env': 'test',
    };

    const client: MockProxy<Redis> = mock<Redis>({
        options: { connectionName: 'ack-test:queue' },
    });
    const readyClient: MockProxy<Redis> = mock<Redis>({ status: 'ready' });
    const reconnectingClient: MockProxy<Redis> = mock<Redis>({
        status: 'reconnecting',
    });
    const connectionError = new Error('connect ECONNREFUSED 127.0.0.1:6379');
    const listeners = new Map<string | symbol, (...args: Error[]) => void>();

    let factory: RedisClientFactory;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RedisClientFactory,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
            ],
        }).compile();

        factory = module.get(RedisClientFactory);
    });

    describe('createCache', () => {
        it('constructs the cache client with the offline queue off, both timeouts, and the Cache: key prefix', () => {
            const client = factory.createCache();

            expect(Redis).toHaveBeenCalledWith('redis://cache', {
                lazyConnect: true,
                enableOfflineQueue: false,
                commandTimeout: 2000,
                connectTimeout: 5000,
                keyPrefix: 'Cache:',
                connectionName: 'ack-test:cache',
            });
            expect(client).toBeInstanceOf(Redis);
        });
    });

    describe('createQueue', () => {
        it('constructs the queue producer client with the queue options and no key prefix', () => {
            const client = factory.createQueue();

            expect(Redis).toHaveBeenCalledWith('redis://queue', {
                lazyConnect: true,
                enableOfflineQueue: false,
                connectTimeout: 5000,
                maxRetriesPerRequest: 1,
                connectionName: 'ack-test:queue',
            });
            expect(client).toBeInstanceOf(Redis);
        });
    });

    describe('connect', () => {
        it('attaches the error and ready listeners, records the client, and resolves it once connected', async () => {
            client.connect.mockResolvedValue(undefined);

            const result = await factory.connect(client);

            expect(client.on).toHaveBeenCalledWith(
                'error',
                expect.any(Function)
            );
            expect(client.on).toHaveBeenCalledWith(
                'ready',
                expect.any(Function)
            );
            expect(client.connect).toHaveBeenCalledTimes(1);
            expect(factory['clients'].has(client)).toBe(true);
            expect(result).toBe(client);
        });

        it('throws an AppUnknownException wrapping the error when the connection fails', async () => {
            client.connect.mockRejectedValue(connectionError);

            await expect(factory.connect(client)).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: connectionError,
                description: 'Connecting to Redis failed',
            });
        });
    });

    describe('onApplicationShutdown', () => {
        beforeEach(async () => {
            readyClient.connect.mockResolvedValue(undefined);
            reconnectingClient.connect.mockResolvedValue(undefined);
            readyClient.quit.mockResolvedValue('OK');
            await Promise.all([
                factory.connect(readyClient),
                factory.connect(reconnectingClient),
            ]);
        });

        it('quits a ready client and disconnects a client in any other status', async () => {
            await factory.onApplicationShutdown();

            expect(readyClient.quit).toHaveBeenCalledTimes(1);
            expect(readyClient.disconnect).not.toHaveBeenCalled();
            expect(reconnectingClient.disconnect).toHaveBeenCalledTimes(1);
            expect(reconnectingClient.quit).not.toHaveBeenCalled();
        });
    });

    describe('onError', () => {
        beforeEach(async () => {
            client.on.mockImplementation((event, listener) => {
                listeners.set(event, listener);
                return client;
            });
            client.connect.mockResolvedValue(undefined);
            await factory.connect(client);
        });

        it('records the client down on its first error', () => {
            listeners.get('error')!(connectionError);

            expect(factory['downClients'].has(client)).toBe(true);
        });

        it('keeps one down record across repeated errors', () => {
            listeners.get('error')!(connectionError);
            listeners.get('error')!(connectionError);

            expect(factory['downClients'].size).toBe(1);
        });
    });

    describe('onReady', () => {
        beforeEach(async () => {
            client.on.mockImplementation((event, listener) => {
                listeners.set(event, listener);
                return client;
            });
            client.connect.mockResolvedValue(undefined);
            await factory.connect(client);
        });

        it('clears a client recorded down', () => {
            listeners.get('error')!(connectionError);
            listeners.get('ready')!();

            expect(factory['downClients'].has(client)).toBe(false);
        });

        it('records nothing for a client never down', () => {
            listeners.get('ready')!();

            expect(factory['downClients'].size).toBe(0);
        });
    });
});
