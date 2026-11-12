import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { z } from 'zod';
import { CacheLeaseSetScript } from '@common/cache/constants/cache.constant';
import type { ICacheLease } from '@common/cache/interfaces/cache.interface';
import { CacheService } from '@common/cache/services/cache.service';
import {
    EnumCacheProcess,
    EnumCacheQueue,
} from '@common/cache/enums/cache.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RedisCacheClient } from '@common/redis/constants/redis.constant';
import { EnumRedisStatusCodeError } from '@common/redis/enums/redis.status-code.enum';
import type { IStubCacheClient } from '@test/unit/helpers/test.unit.cache.helper';

describe('CacheService', () => {
    const configGet = vi.fn<(key: string) => number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const redis: MockProxy<IStubCacheClient> = mock<IStubCacheClient>();

    const key = 'Entry:entry-1';
    const ttlInMs = 4000;
    const now = new Date('2026-01-03T00:00:00.000Z');
    const entrySchema = z.object({ id: z.string(), name: z.string() });
    const entry = { id: 'entry-1', name: 'Entry One' };
    const loader = vi.fn<() => Promise<typeof entry | null>>();
    const connectionError = new Error('Connection is closed.');
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
                { provide: RedisCacheClient, useValue: redis },
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

        it('returns the cached JSON value when it passes the schema and calls no loader', async () => {
            redis.get.mockResolvedValue(JSON.stringify(entry));

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader
            );

            expect(result).toEqual(entry);
            expect(redis.get).toHaveBeenCalledWith(key);
            expect(loader).not.toHaveBeenCalled();
        });

        it('revives an ISO date through the schema', async () => {
            const dated = { at: new Date('2026-01-01T00:00:00.000Z') };
            const datedLoader = vi.fn<() => Promise<typeof dated | null>>();
            redis.get.mockResolvedValue('{"at":"2026-01-01T00:00:00.000Z"}');

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
            redis.get.mockResolvedValue(null);
            loader.mockResolvedValue(entry);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader
            );

            expect(result).toEqual(entry);
            expect(loader).toHaveBeenCalledTimes(1);
            expect(redis.unlink).not.toHaveBeenCalled();
            expect(service['warnedAtByKey'].size).toBe(0);
        });

        it('does not store a null result', async () => {
            redis.get.mockResolvedValue(null);
            loader.mockResolvedValue(null);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader
            );

            expect(result).toBeNull();
            expect(redis.set).not.toHaveBeenCalled();
        });

        it('unlinks the key, records a warning, and loads when the entry fails the schema', async () => {
            redis.get.mockResolvedValue('{"id":1}');
            loader.mockResolvedValue(entry);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader
            );

            expect(result).toEqual(entry);
            expect(redis.unlink).toHaveBeenCalledWith(key);
            expect(service['warnedAtByKey'].get(key)).toBe(now.getTime());
            expect(loader).toHaveBeenCalledTimes(1);
            expect(redis.set).toHaveBeenCalledWith(
                key,
                JSON.stringify(entry),
                'PX',
                4000
            );
        });

        it('records a warning, loads, and sets the loaded value without an unlink when the entry is not JSON', async () => {
            redis.get.mockResolvedValue('not-json');
            loader.mockResolvedValue(entry);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader
            );

            expect(result).toEqual(entry);
            expect(service['warnedAtByKey'].get(key)).toBe(now.getTime());
            expect(redis.unlink).not.toHaveBeenCalled();
            expect(redis.set).toHaveBeenCalledWith(
                key,
                JSON.stringify(entry),
                'PX',
                4000
            );
        });

        it('loads and records a warning when the read fails with a non-connection error', async () => {
            redis.get.mockRejectedValue(new Error('wrong kind of value'));
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
            redis.get.mockRejectedValue(connectionError);

            await expect(
                service.readThrough(key, entrySchema, ttlInMs, loader)
            ).rejects.toMatchObject({
                ...redisUnavailable,
                rawError: connectionError,
            });
            expect(loader).not.toHaveBeenCalled();
        });

        it('returns the loaded value and records a warning when the set fails with a non-connection error', async () => {
            redis.get.mockResolvedValue(null);
            redis.set.mockRejectedValue(new Error('OOM'));
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
            redis.get.mockResolvedValue(null);
            redis.set.mockRejectedValue(connectionError);
            loader.mockResolvedValue(entry);

            await expect(
                service.readThrough(key, entrySchema, ttlInMs, loader)
            ).rejects.toMatchObject({
                ...redisUnavailable,
                rawError: connectionError,
            });
        });

        it('propagates a loader error unchanged and records no warning', async () => {
            const failure = new Error('database down');
            redis.get.mockResolvedValue(null);
            loader.mockRejectedValue(failure);

            await expect(
                service.readThrough(key, entrySchema, ttlInMs, loader)
            ).rejects.toBe(failure);
            expect(service['warnedAtByKey'].size).toBe(0);
        });

        it('loads and sets the result as JSON with a PX TTL on a miss', async () => {
            redis.get.mockResolvedValue(null);
            loader.mockResolvedValue(entry);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader
            );

            expect(result).toEqual(entry);
            expect(redis.set).toHaveBeenCalledWith(
                key,
                JSON.stringify(entry),
                'PX',
                4000
            );
        });
        it('takes SET NX PX on the lease key before the loader runs', async () => {
            redis.get.mockResolvedValue(null);
            redis.set.mockResolvedValue('OK');
            loader.mockResolvedValue(entry);

            await service.readThrough(key, entrySchema, ttlInMs, loader, {
                lease,
            });

            expect(redis.set).toHaveBeenCalledWith(
                'lease',
                'lease-token',
                'PX',
                10000,
                'NX'
            );
            expect(redis.set).toHaveBeenCalledBefore(loader);
        });

        it('sets the entry through CacheLeaseSetScript while the lease holds the token', async () => {
            redis.get.mockResolvedValue(null);
            redis.set.mockResolvedValue('OK');
            redis.eval.mockResolvedValue(1);
            loader.mockResolvedValue(entry);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader,
                { lease }
            );

            expect(result).toEqual(entry);
            expect(redis.eval).toHaveBeenCalledWith(
                CacheLeaseSetScript,
                2,
                key,
                'lease',
                'lease-token',
                JSON.stringify(entry),
                '4000'
            );
            expect(redis.set).toHaveBeenCalledTimes(1);
        });

        it('serves the loaded value without a set when another reader holds the lease', async () => {
            redis.get.mockResolvedValue(null);
            redis.set.mockResolvedValue(null);
            loader.mockResolvedValue(entry);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader,
                { lease }
            );

            expect(result).toEqual(entry);
            expect(redis.eval).not.toHaveBeenCalled();
            expect(redis.set).toHaveBeenCalledTimes(1);
        });

        it('serves the loaded value without a set and records a warning when the lease take fails with a non-connection error', async () => {
            redis.get.mockResolvedValue(null);
            redis.set.mockRejectedValue(new Error('READONLY'));
            loader.mockResolvedValue(entry);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader,
                { lease }
            );

            expect(result).toEqual(entry);
            expect(redis.eval).not.toHaveBeenCalled();
            expect(redis.set).toHaveBeenCalledTimes(1);
            expect(service['warnedAtByKey'].get(key)).toBe(now.getTime());
        });

        it('throws RedisUnavailableException before the loader when the lease take fails with a connection error', async () => {
            redis.get.mockResolvedValue(null);
            redis.set.mockRejectedValue(connectionError);

            await expect(
                service.readThrough(key, entrySchema, ttlInMs, loader, {
                    lease,
                })
            ).rejects.toMatchObject({
                ...redisUnavailable,
                rawError: connectionError,
            });
            expect(loader).not.toHaveBeenCalled();
        });

        it('does not run the script for a null result', async () => {
            redis.get.mockResolvedValue(null);
            redis.set.mockResolvedValue('OK');
            loader.mockResolvedValue(null);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader,
                { lease }
            );

            expect(result).toBeNull();
            expect(redis.eval).not.toHaveBeenCalled();
        });

        it('records a warning when the script fails with a non-connection error', async () => {
            redis.get.mockResolvedValue(null);
            redis.set.mockResolvedValue('OK');
            redis.eval.mockRejectedValue(new Error('NOSCRIPT'));
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

        it('deletes the keys in one UNLINK', async () => {
            redis.unlink.mockResolvedValue(2);

            await service.invalidate(keys);

            expect(redis.unlink).toHaveBeenCalledTimes(1);
            expect(redis.unlink).toHaveBeenCalledWith(
                'Entry:entry-1',
                'Entry:Lease:entry-1'
            );
        });

        it('issues no command for an empty list', async () => {
            await service.invalidate([]);

            expect(redis.unlink).not.toHaveBeenCalled();
        });

        it('throws RedisUnavailableException on a connection error', async () => {
            redis.unlink.mockRejectedValue(connectionError);

            await expect(service.invalidate(keys)).rejects.toMatchObject({
                ...redisUnavailable,
                rawError: connectionError,
            });
        });

        it('records a warning and resolves on a non-connection error', async () => {
            redis.unlink.mockRejectedValue(new Error('READONLY'));

            await expect(service.invalidate(keys)).resolves.toBeUndefined();
            expect(
                service['warnedAtByKey'].get(
                    'Entry:entry-1,Entry:Lease:entry-1'
                )
            ).toBe(now.getTime());
        });
    });

    describe('invalidateEffect', () => {
        it('returns the high-priority cache invalidate effect carrying the keys and no business key', () => {
            const effect = service.invalidateEffect(['Entry:1', 'Lease:1']);

            expect(effect).toEqual({
                queue: EnumCacheQueue.cache,
                name: EnumCacheProcess.invalidate,
                data: { keys: ['Entry:1', 'Lease:1'] },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
        });
    });

    describe('isConnectionError', () => {
        it.each([
            "Stream isn't writeable and enableOfflineQueue options is false",
            'Command timed out',
            'Connection is closed.',
        ])("returns true for the message '%s'", message => {
            expect(service.isConnectionError(new Error(message))).toBe(true);
        });

        it.each(['MaxRetriesPerRequestError', 'AbortError'])(
            "returns true for the name '%s'",
            name => {
                const error = new Error('redis failure');
                error.name = name;

                expect(service.isConnectionError(error)).toBe(true);
            }
        );

        it.each([
            'ECONNREFUSED',
            'ETIMEDOUT',
            'ECONNRESET',
            'EPIPE',
            'ENOTFOUND',
            'EHOSTUNREACH',
        ])("returns true for the code '%s'", code => {
            const error = Object.assign(new Error('socket failure'), { code });

            expect(service.isConnectionError(error)).toBe(true);
        });

        it('returns false for any other Error', () => {
            const error = Object.assign(new Error('READONLY'), {
                code: 'READONLY',
            });

            expect(service.isConnectionError(error)).toBe(false);
        });

        it('returns false for a SyntaxError', () => {
            expect(
                service.isConnectionError(new SyntaxError('Unexpected token'))
            ).toBe(false);
        });

        it('returns false for a plain object carrying a connection code', () => {
            expect(service.isConnectionError({ code: 'ECONNREFUSED' })).toBe(
                false
            );
        });

        it('returns false for a string', () => {
            expect(service.isConnectionError('Connection is closed.')).toBe(
                false
            );
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
