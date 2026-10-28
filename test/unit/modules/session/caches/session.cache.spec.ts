import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Cache } from 'cache-manager';
import type Keyv from 'keyv';
import type KeyvRedis from '@keyv/redis';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { SessionCache } from '@modules/session/caches/session.cache';
import type { ISessionCache } from '@modules/session/interfaces/session.interface';

type RedisClientConnection = Awaited<
    ReturnType<KeyvRedis<string>['getClient']>
>;

interface IStubRedisClient {
    set: (
        key: string,
        value: string,
        options: unknown
    ) => Promise<string | null>;
}

describe('SessionCache', () => {
    const cacheManager: MockProxy<Cache> = mock<Cache>();
    const keyvGet =
        vi.fn<(key: string) => Promise<ISessionCache | undefined>>();
    const keyv: MockProxy<Keyv> = mock<Keyv>({
        get: keyvGet as unknown as Keyv['get'],
    });
    const store: MockProxy<KeyvRedis<string>> = mock<KeyvRedis<string>>();
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();

    let cache: SessionCache;

    beforeEach(async () => {
        vi.resetAllMocks();

        (keyv as unknown as { store: KeyvRedis<string> }).store = store;
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string> = {
                'session.keyPattern': 'Session:{userId}:{sessionId}',
            };
            return values[key];
        });
        helperStringService.fillPattern.mockImplementation((_pattern, tokens) =>
            Object.values(tokens).join(':')
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionCache,
                { provide: CacheMainProvider, useValue: cacheManager },
                { provide: RedisClientCachedProvider, useValue: keyv },
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperDateService,
                    useValue: helperDateService,
                },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
            ],
        }).compile();

        cache = module.get(SessionCache);
    });

    describe('getLogin', () => {
        it('returns the cached login session read through the keyv client', async () => {
            const session: ISessionCache = {
                userId: 'user-1',
                sessionId: 'session-1',
                expiredAt: new Date('2026-02-01T00:00:00.000Z'),
                jti: 'jti-value',
            };
            keyvGet.mockResolvedValue(session);

            const result = await cache.getLogin('user-1', 'session-1');

            expect(result).toEqual(session);
            expect(keyvGet).toHaveBeenCalledWith('user-1:session-1');
            expect(cacheManager.get).not.toHaveBeenCalled();
        });

        it('returns null when no login is cached', async () => {
            keyvGet.mockResolvedValue(undefined);

            const result = await cache.getLogin('user-1', 'session-1');

            expect(result).toBeNull();
        });

        it('propagates a store failure instead of reporting a miss', async () => {
            const failure = new Error('redis down');
            keyvGet.mockRejectedValue(failure);

            await expect(cache.getLogin('user-1', 'session-1')).rejects.toBe(
                failure
            );
        });
    });

    describe('setLogin', () => {
        it('stores a new login session with a ttl derived from its expiry', async () => {
            const now = new Date('2026-01-01T00:00:00.000Z');
            const expiredAt = new Date('2026-01-01T01:00:00.000Z');
            helperDateService.create.mockReturnValue(now);

            await cache.setLogin('user-1', 'session-1', 'jti-value', expiredAt);

            expect(cacheManager.set).toHaveBeenCalledWith(
                'user-1:session-1',
                {
                    userId: 'user-1',
                    sessionId: 'session-1',
                    expiredAt,
                    jti: 'jti-value',
                },
                3600000
            );
        });
    });

    describe('updateLogin', () => {
        const session: ISessionCache = {
            userId: 'user-1',
            sessionId: 'session-1',
            expiredAt: new Date('2026-01-01T01:00:00.000Z'),
            jti: 'old-jti',
        };

        it('rotates the jti and resets the ttl, answering true on a conditional write', async () => {
            const now = new Date('2026-01-01T00:00:00.000Z');
            helperDateService.create.mockReturnValue(now);
            store.createKeyPrefix.mockReturnValue('prefixed-key');
            store.namespace = 'session';
            keyv.serializeData.mockResolvedValue('serialized-value');
            const client: MockProxy<IStubRedisClient> =
                mock<IStubRedisClient>();
            client.set.mockResolvedValue('OK');
            store.getClient.mockResolvedValue(
                client as unknown as RedisClientConnection
            );

            const result = await cache.updateLogin(
                'user-1',
                'session-1',
                session,
                'new-jti',
                60000
            );

            expect(result).toBe(true);
            expect(store.createKeyPrefix).toHaveBeenCalledWith(
                'user-1:session-1',
                'session'
            );
            expect(keyv.serializeData).toHaveBeenCalledWith({
                value: { ...session, jti: 'new-jti' },
                expires: now.getTime() + 60000,
            });
            expect(client.set).toHaveBeenCalledWith(
                'prefixed-key',
                'serialized-value',
                {
                    expiration: { type: 'PX', value: 60000 },
                    condition: 'XX',
                }
            );
        });

        it('answers false when the conditional write finds nothing to update', async () => {
            helperDateService.create.mockReturnValue(
                new Date('2026-01-01T00:00:00.000Z')
            );
            store.createKeyPrefix.mockReturnValue('prefixed-key');
            keyv.serializeData.mockResolvedValue('serialized-value');
            const client: MockProxy<IStubRedisClient> =
                mock<IStubRedisClient>();
            client.set.mockResolvedValue(null);
            store.getClient.mockResolvedValue(
                client as unknown as RedisClientConnection
            );

            const result = await cache.updateLogin(
                'user-1',
                'session-1',
                session,
                'new-jti',
                60000
            );

            expect(result).toBe(false);
        });
    });

    describe('deleteLogins', () => {
        it('deletes exactly the given session entries', async () => {
            await cache.deleteLogins('user-1', [
                { id: 'session-1' },
                { id: 'session-2' },
            ]);

            expect(cacheManager.mdel).toHaveBeenCalledWith([
                'user-1:session-1',
                'user-1:session-2',
            ]);
        });

        it('does nothing for an empty session list', async () => {
            await cache.deleteLogins('user-1', []);

            expect(cacheManager.mdel).not.toHaveBeenCalled();
        });
    });

    describe('buildLoginKey', () => {
        it('fills the configured key pattern with the user and session ids', () => {
            const result = cache['buildLoginKey']('user-1', 'session-1');

            expect(result).toBe('user-1:session-1');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Session:{userId}:{sessionId}',
                { userId: 'user-1', sessionId: 'session-1' }
            );
        });
    });

    describe('getStore', () => {
        it('returns the keyv redis store', () => {
            const result = cache['getStore']();

            expect(result).toBe(store);
        });
    });
});
