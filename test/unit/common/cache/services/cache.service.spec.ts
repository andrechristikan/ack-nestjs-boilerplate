import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type Keyv from 'keyv';
import type KeyvRedis from '@keyv/redis';
import { RedisErrorMessages } from '@keyv/redis';
import {
    ClientClosedError,
    ClientOfflineError,
    ConnectionTimeoutError,
    SocketClosedUnexpectedlyError,
    TimeoutError,
} from '@redis/client';
import { z } from 'zod';
import { CacheLeaseSetScript } from '@common/cache/constants/cache.constant';
import type { ICacheLease } from '@common/cache/interfaces/cache.interface';
import { CacheService } from '@common/cache/services/cache.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import { EnumRedisStatusCodeError } from '@common/redis/enums/redis.status-code.enum';
import { stubStoreClient } from '@test/unit/helpers/test.unit.cache.helper';

describe('CacheService', () => {
    const configGet = vi.fn<(key: string) => number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const keyvGet = vi.fn<(key: string | string[]) => Promise<unknown>>();
    const keyv: MockProxy<Keyv> = mock<Keyv>({
        get: keyvGet as Keyv['get'],
    });
    const store: MockProxy<KeyvRedis<string>> = mock<KeyvRedis<string>>();

    const key = 'Entry:entry-1';
    const ttlInMs = 4000;
    const now = new Date('2026-01-03T00:00:00.000Z');
    const entrySchema = z.object({ id: z.string(), name: z.string() });
    const entry = { id: 'entry-1', name: 'Entry One' };
    const loader = vi.fn<() => Promise<typeof entry | null>>();
    const redisUnavailable = {
        module: 'redis',
        statusCode: EnumRedisStatusCodeError.unavailable,
        statusCodeKey:
            EnumRedisStatusCodeError[EnumRedisStatusCodeError.unavailable],
        messagePath: 'redis.error.unavailable',
    };

    let service: CacheService;

    beforeEach(async () => {
        vi.resetAllMocks();
        (keyv as unknown as { store: KeyvRedis<string> }).store = store;
        configGet.mockImplementation((configKey: string) => {
            const values: Record<string, number> = {
                'redis.warnWindowInMs': 60000,
            };
            return values[configKey];
        });
        helperDateService.create.mockReturnValue(now);
        helperStringService.random.mockReturnValue('lease-token');

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CacheService,
                { provide: RedisClientCachedProvider, useValue: keyv },
                { provide: ConfigService, useValue: configService },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
            ],
        }).compile();

        service = module.get(CacheService);
    });

    describe('readThrough', () => {
        const lease: ICacheLease = { key: 'lease', ttlInMs: 10000 };

        it('returns the cached value when it passes the schema and calls no loader', async () => {
            keyvGet.mockResolvedValue(entry);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader
            );

            expect(result).toEqual(entry);
            expect(keyvGet).toHaveBeenCalledWith(key);
            expect(loader).not.toHaveBeenCalled();
        });

        it('revives an ISO date through the schema', async () => {
            const dated = { at: new Date('2026-01-01T00:00:00.000Z') };
            const datedLoader = vi.fn<() => Promise<typeof dated | null>>();
            keyvGet.mockResolvedValue({ at: '2026-01-01T00:00:00.000Z' });

            const result = await service.readThrough(
                key,
                z.object({ at: z.coerce.date() }),
                ttlInMs,
                datedLoader
            );

            expect(result).toEqual(dated);
            expect(datedLoader).not.toHaveBeenCalled();
        });

        it('treats a missing entry as a miss with no delete and no warning', async () => {
            keyvGet.mockResolvedValue(undefined);
            loader.mockResolvedValue(entry);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader
            );

            expect(result).toEqual(entry);
            expect(loader).toHaveBeenCalledTimes(1);
            expect(keyv.delete).not.toHaveBeenCalled();
            expect(service['warnedAtByKey'].size).toBe(0);
        });

        it('loads and sets the result with the TTL on a miss', async () => {
            keyvGet.mockResolvedValue(undefined);
            loader.mockResolvedValue(entry);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader
            );

            expect(result).toEqual(entry);
            expect(keyv.set).toHaveBeenCalledWith(key, entry, ttlInMs);
        });

        it('does not store a null result', async () => {
            keyvGet.mockResolvedValue(undefined);
            loader.mockResolvedValue(null);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader
            );

            expect(result).toBeNull();
            expect(keyv.set).not.toHaveBeenCalled();
        });

        it('deletes the key, records a warning, and loads when the entry fails the schema', async () => {
            keyvGet.mockResolvedValue({ id: 1 });
            loader.mockResolvedValue(entry);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader
            );

            expect(result).toEqual(entry);
            expect(keyv.delete).toHaveBeenCalledWith(key);
            expect(service['warnedAtByKey'].get(key)).toBe(now.getTime());
            expect(loader).toHaveBeenCalledTimes(1);
            expect(keyv.set).toHaveBeenCalledWith(key, entry, ttlInMs);
        });

        it('loads and records a warning when the read fails with a non-connection error', async () => {
            keyvGet.mockRejectedValue(new Error('wrong kind of value'));
            loader.mockResolvedValue(entry);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader
            );

            expect(result).toEqual(entry);
            expect(loader).toHaveBeenCalledTimes(1);
            expect(service['warnedAtByKey'].get(key)).toBe(now.getTime());
        });

        it('throws RedisUnavailableException carrying the caught error as rawError when the read fails with a connection error', async () => {
            const failure = new ClientOfflineError();
            keyvGet.mockRejectedValue(failure);

            await expect(
                service.readThrough(key, entrySchema, ttlInMs, loader)
            ).rejects.toMatchObject({ ...redisUnavailable, rawError: failure });
            expect(loader).not.toHaveBeenCalled();
        });

        it('returns the loaded value and records a warning when the set fails with a non-connection error', async () => {
            keyvGet.mockResolvedValue(undefined);
            keyv.set.mockRejectedValue(new Error('OOM'));
            loader.mockResolvedValue(entry);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader
            );

            expect(result).toEqual(entry);
            expect(service['warnedAtByKey'].get(key)).toBe(now.getTime());
        });

        it('throws RedisUnavailableException when the set fails with a connection error', async () => {
            const failure = new TimeoutError();
            keyvGet.mockResolvedValue(undefined);
            keyv.set.mockRejectedValue(failure);
            loader.mockResolvedValue(entry);

            await expect(
                service.readThrough(key, entrySchema, ttlInMs, loader)
            ).rejects.toMatchObject({ ...redisUnavailable, rawError: failure });
        });

        it('propagates a loader error unchanged and records no warning', async () => {
            const failure = new Error('database down');
            keyvGet.mockResolvedValue(undefined);
            loader.mockRejectedValue(failure);

            await expect(
                service.readThrough(key, entrySchema, ttlInMs, loader)
            ).rejects.toBe(failure);
            expect(service['warnedAtByKey'].size).toBe(0);
        });

        it('takes SET NX PX on the prefixed lease key before the loader runs', async () => {
            const client = stubStoreClient({ keyv, store });
            keyvGet.mockResolvedValue(undefined);
            client.set.mockResolvedValue('OK');
            loader.mockResolvedValue(entry);

            await service.readThrough(key, entrySchema, ttlInMs, loader, {
                lease,
            });

            expect(store.createKeyPrefix).toHaveBeenCalledWith(
                'lease',
                'cache'
            );
            expect(client.set).toHaveBeenCalledWith(
                'prefixed-lease',
                'lease-token',
                { expiration: { type: 'PX', value: 10000 }, condition: 'NX' }
            );
            expect(client.set).toHaveBeenCalledBefore(loader);
        });

        it('sets the entry through CacheLeaseSetScript while the lease holds the token', async () => {
            const client = stubStoreClient({ keyv, store });
            keyvGet.mockResolvedValue(undefined);
            client.set.mockResolvedValue('OK');
            client.eval.mockResolvedValue(1);
            loader.mockResolvedValue(entry);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader,
                { lease }
            );

            expect(result).toEqual(entry);
            expect(keyv.serializeData).toHaveBeenCalledWith({
                value: entry,
                expires: now.getTime() + ttlInMs,
            });
            expect(client.eval).toHaveBeenCalledWith(CacheLeaseSetScript, {
                keys: [`prefixed-${key}`, 'prefixed-lease'],
                arguments: ['lease-token', 'serialized-value', `${ttlInMs}`],
            });
            expect(keyv.set).not.toHaveBeenCalled();
        });

        it('serves the loaded value without a set when another reader holds the lease', async () => {
            const client = stubStoreClient({ keyv, store });
            keyvGet.mockResolvedValue(undefined);
            client.set.mockResolvedValue(null);
            loader.mockResolvedValue(entry);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader,
                { lease }
            );

            expect(result).toEqual(entry);
            expect(client.eval).not.toHaveBeenCalled();
            expect(keyv.set).not.toHaveBeenCalled();
        });

        it('serves the loaded value without a set and records a warning when the lease take fails with a non-connection error', async () => {
            const client = stubStoreClient({ keyv, store });
            keyvGet.mockResolvedValue(undefined);
            client.set.mockRejectedValue(new Error('READONLY'));
            loader.mockResolvedValue(entry);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader,
                { lease }
            );

            expect(result).toEqual(entry);
            expect(client.eval).not.toHaveBeenCalled();
            expect(keyv.set).not.toHaveBeenCalled();
            expect(service['warnedAtByKey'].get(key)).toBe(now.getTime());
        });

        it('throws RedisUnavailableException before the loader when the lease take fails with a connection error', async () => {
            const failure = new ClientOfflineError();
            const client = stubStoreClient({ keyv, store });
            keyvGet.mockResolvedValue(undefined);
            client.set.mockRejectedValue(failure);

            await expect(
                service.readThrough(key, entrySchema, ttlInMs, loader, {
                    lease,
                })
            ).rejects.toMatchObject({ ...redisUnavailable, rawError: failure });
            expect(loader).not.toHaveBeenCalled();
        });

        it('does not run the script for a null result', async () => {
            const client = stubStoreClient({ keyv, store });
            keyvGet.mockResolvedValue(undefined);
            client.set.mockResolvedValue('OK');
            loader.mockResolvedValue(null);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader,
                { lease }
            );

            expect(result).toBeNull();
            expect(client.eval).not.toHaveBeenCalled();
        });

        it('records a warning when the script fails with a non-connection error', async () => {
            const client = stubStoreClient({ keyv, store });
            keyvGet.mockResolvedValue(undefined);
            client.set.mockResolvedValue('OK');
            client.eval.mockRejectedValue(new Error('NOSCRIPT'));
            loader.mockResolvedValue(entry);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader,
                { lease }
            );

            expect(result).toEqual(entry);
            expect(service['warnedAtByKey'].get(key)).toBe(now.getTime());
        });
    });

    describe('invalidate', () => {
        const keys = ['Entry:entry-1', 'Entry:Lease:entry-1'];

        it('deletes the keys in one deleteMany', async () => {
            keyv.deleteMany.mockResolvedValue(true);

            await service.invalidate(keys);

            expect(keyv.deleteMany).toHaveBeenCalledTimes(1);
            expect(keyv.deleteMany).toHaveBeenCalledWith(keys);
        });

        it('throws RedisUnavailableException on a connection error', async () => {
            const failure = new ClientOfflineError();
            keyv.deleteMany.mockRejectedValue(failure);

            await expect(service.invalidate(keys)).rejects.toMatchObject({
                ...redisUnavailable,
                rawError: failure,
            });
        });

        it('records a warning and resolves on a non-connection error', async () => {
            keyv.deleteMany.mockRejectedValue(new Error('READONLY'));

            await expect(service.invalidate(keys)).resolves.toBeUndefined();
            expect(
                service['warnedAtByKey'].get(
                    'Entry:entry-1,Entry:Lease:entry-1'
                )
            ).toBe(now.getTime());
        });
    });

    describe('isConnectionError', () => {
        it.each([
            { name: 'ClientOfflineError', error: new ClientOfflineError() },
            { name: 'ClientClosedError', error: new ClientClosedError() },
            {
                name: 'ConnectionTimeoutError',
                error: new ConnectionTimeoutError(),
            },
            {
                name: 'SocketClosedUnexpectedlyError',
                error: new SocketClosedUnexpectedlyError(),
            },
            { name: 'TimeoutError', error: new TimeoutError() },
            {
                name: 'RedisClientNotConnectedThrown',
                error: new Error(
                    RedisErrorMessages.RedisClientNotConnectedThrown
                ),
            },
        ])('returns true for $name', ({ error }) => {
            expect(service.isConnectionError(error)).toBe(true);
        });

        it('returns false for any other Error and for a non-Error value', () => {
            expect(
                service.isConnectionError(new Error('wrong kind of value'))
            ).toBe(false);
            expect(service.isConnectionError('offline')).toBe(false);
        });
    });

    describe('isFirstInWindow', () => {
        it('returns true and records the key on its first call', () => {
            const result = service.isFirstInWindow(key);

            expect(result).toBe(true);
            expect(service['warnedAtByKey'].get(key)).toBe(now.getTime());
        });

        it('returns false for a repeat inside the window', () => {
            helperDateService.create
                .mockReturnValueOnce(now)
                .mockReturnValueOnce(new Date('2026-01-03T00:00:59.999Z'));

            service.isFirstInWindow(key);
            const result = service.isFirstInWindow(key);

            expect(result).toBe(false);
        });

        it('returns true once the window has passed', () => {
            helperDateService.create
                .mockReturnValueOnce(now)
                .mockReturnValueOnce(new Date('2026-01-03T00:01:00.000Z'));

            service.isFirstInWindow(key);
            const result = service.isFirstInWindow(key);

            expect(result).toBe(true);
        });
    });

    describe('warnOnce', () => {
        const failure = new Error('wrong kind of value');

        it('records the key with the current time on its first warning', () => {
            service.warnOnce(key, failure, 'Cache read failed');

            expect(service['warnedAtByKey'].get(key)).toBe(now.getTime());
        });

        it('keeps the first time for a repeat inside the window', () => {
            helperDateService.create
                .mockReturnValueOnce(now)
                .mockReturnValueOnce(new Date('2026-01-03T00:00:30.000Z'));

            service.warnOnce(key, failure, 'Cache read failed');
            service.warnOnce(key, failure, 'Cache read failed');

            expect(service['warnedAtByKey'].get(key)).toBe(now.getTime());
        });

        it('re-records the key once the window has passed', () => {
            const later = new Date('2026-01-03T00:01:00.000Z');
            helperDateService.create
                .mockReturnValueOnce(now)
                .mockReturnValueOnce(later);

            service.warnOnce(key, failure, 'Cache read failed');
            service.warnOnce(key, failure, 'Cache read failed');

            expect(service['warnedAtByKey'].get(key)).toBe(later.getTime());
        });

        it('drops entries older than the window', () => {
            helperDateService.create
                .mockReturnValueOnce(now)
                .mockReturnValueOnce(new Date('2026-01-03T00:01:00.000Z'));

            service.warnOnce('Entry:old', failure, 'Cache read failed');
            service.warnOnce(key, failure, 'Cache read failed');

            expect([...service['warnedAtByKey'].keys()]).toEqual([key]);
        });
    });
});
