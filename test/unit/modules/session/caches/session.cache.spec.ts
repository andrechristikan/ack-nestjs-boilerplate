import { EnumSessionCacheUpdate } from '@modules/session/enums/session.enum';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Cache } from 'cache-manager';
import type Keyv from 'keyv';
import type KeyvRedis from '@keyv/redis';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { SessionCache } from '@modules/session/caches/session.cache';
import type { ISessionCache } from '@modules/session/interfaces/session.interface';
import { stubStoreClient } from '@test/unit/helpers/test.unit.cache.helper';

describe('SessionCache', () => {
    const cacheManager: MockProxy<Cache> = mock<Cache>();
    const keyvGet =
        vi.fn<(key: string) => Promise<ISessionCache | undefined>>();
    const keyv: MockProxy<Keyv> = mock<Keyv>({
        get: keyvGet as unknown as Keyv['get'],
    });
    const store: MockProxy<KeyvRedis<string>> = mock<KeyvRedis<string>>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();

    let cache: SessionCache;

    beforeEach(async () => {
        vi.resetAllMocks();

        (keyv as unknown as { store: KeyvRedis<string> }).store = store;
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'session.keyPattern': 'Session:{userId}:{sessionId}',
                'session.loginCacheTtlInMs': 900000,
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
                { provide: HelperHashService, useValue: helperHashService },
            ],
        }).compile();

        cache = module.get(SessionCache);
    });

    describe('getLogin', () => {
        it('returns the cached login session read through the keyv client', async () => {
            const session: ISessionCache = {
                userId: 'user-1',
                sessionId: 'session-1',
                jtiDigest: 'jti-digest',
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
        it('stores a new login session for the access-token lifetime with the jti digest, never the raw jti', async () => {
            helperHashService.sha256Hash.mockImplementation(
                value => `hash(${value})`
            );

            await cache.setLogin('user-1', 'session-1', 'jti-value');

            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'jti-value'
            );
            expect(cacheManager.set).toHaveBeenCalledWith(
                'user-1:session-1',
                {
                    userId: 'user-1',
                    sessionId: 'session-1',
                    jtiDigest: 'hash(jti-value)',
                },
                900000
            );
        });
    });

    describe('updateLogin', () => {
        const now = new Date('2026-01-01T00:00:00.000Z');

        beforeEach(() => {
            helperDateService.create.mockReturnValue(now);
            helperHashService.sha256Hash.mockImplementation(
                value => `hash(${value})`
            );
        });

        it('sends one compare-and-set script holding the old jti digest and the rotated entry, answering updated when the script replies updated', async () => {
            const client = stubStoreClient({ keyv, store });
            client.eval.mockResolvedValue(EnumSessionCacheUpdate.updated);

            const result = await cache.updateLogin(
                'user-1',
                'session-1',
                'old-jti',
                'new-jti'
            );

            expect(result).toBe(EnumSessionCacheUpdate.updated);
            expect(store.createKeyPrefix).toHaveBeenCalledWith(
                'user-1:session-1',
                'cache'
            );
            expect(keyv.serializeData).toHaveBeenCalledWith({
                value: {
                    userId: 'user-1',
                    sessionId: 'session-1',
                    jtiDigest: 'hash(new-jti)',
                },
                expires: now.getTime() + 900000,
            });
            expect(client.eval).toHaveBeenCalledWith(expect.any(String), {
                keys: ['prefixed-user-1:session-1'],
                arguments: ['hash(old-jti)', 'serialized-value', '900000'],
            });
            expect(keyvGet).not.toHaveBeenCalled();
        });

        it('compares the field the rotated entry writes inside the compare-and-set script', async () => {
            const client = stubStoreClient({ keyv, store });
            client.eval.mockResolvedValue(EnumSessionCacheUpdate.updated);

            await cache.updateLogin(
                'user-1',
                'session-1',
                'old-jti',
                'new-jti'
            );

            expect(client.eval).toHaveBeenCalledWith(
                expect.stringContaining('entry.value.jtiDigest'),
                expect.anything()
            );
        });

        it('answers mismatch when the script finds another jti digest', async () => {
            const client = stubStoreClient({ keyv, store });
            client.eval.mockResolvedValue(EnumSessionCacheUpdate.mismatch);

            const result = await cache.updateLogin(
                'user-1',
                'session-1',
                'other-jti',
                'new-jti'
            );

            expect(result).toBe(EnumSessionCacheUpdate.mismatch);
        });

        it('answers absent when the script finds no entry', async () => {
            const client = stubStoreClient({ keyv, store });
            client.eval.mockResolvedValue(EnumSessionCacheUpdate.absent);

            const result = await cache.updateLogin(
                'user-1',
                'session-1',
                'old-jti',
                'new-jti'
            );

            expect(result).toBe(EnumSessionCacheUpdate.absent);
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
