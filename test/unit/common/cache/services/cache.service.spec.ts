import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { MockInstance } from 'vitest';
import { z } from 'zod';
import type { ICacheLease } from '@common/cache/interfaces/cache.interface';
import { CacheService } from '@common/cache/services/cache.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RedisCacheClient } from '@common/redis/constants/redis.constant';
import { EnumRedisStatusCodeError } from '@common/redis/enums/redis.status-code.enum';
import type { IStubCacheClient } from '@test/unit/helpers/test.unit.cache.helper';

describe('CacheService', () => {
    const redis: MockProxy<IStubCacheClient> = mock<IStubCacheClient>();

    const key = 'Entry:entry-1';
    const ttlInMs = 4000;
    const entrySchema = z.object({ id: z.string(), name: z.string() });
    const entry = { id: 'entry-1', name: 'Entry One' };
    const loader = vi.fn<() => Promise<typeof entry | null>>();
    const connectionError = new Error('Connection is closed.');
    const plainError = new Error(
        'WRONGTYPE Operation against a key holding the wrong kind of value'
    );
    const failures = [
        ['a plain error', plainError],
        ['a connection error', connectionError],
    ] as const;
    const redisUnavailable = {
        module: 'redis',
        statusCode: EnumRedisStatusCodeError.unavailable,
    };

    let service: CacheService;
    let warn: MockInstance<Logger['warn']>;
    let helperStringService: HelperStringService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CacheService,
                { provide: RedisCacheClient, useValue: redis },
                HelperStringService,
            ],
        }).compile();

        warn = vi.spyOn(Logger.prototype, 'warn');
        service = module.get(CacheService);
        helperStringService = module.get(HelperStringService);
        vi.spyOn(helperStringService, 'random').mockReturnValue('lease-token');
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
            expect(warn).not.toHaveBeenCalled();
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

        it('unlinks the key, warns on every read, and loads when the entry fails the schema', async () => {
            redis.get.mockResolvedValue('{"id":1}');
            loader.mockResolvedValue(entry);

            const first = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader
            );
            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader
            );

            expect(first).toEqual(entry);
            expect(result).toEqual(entry);
            expect(redis.unlink).toHaveBeenCalledTimes(2);
            expect(redis.unlink).toHaveBeenCalledWith(key);
            expect(warn).toHaveBeenCalledTimes(2);
            expect(warn).toHaveBeenCalledWith(
                { key, err: expect.any(Error) },
                'Cache entry failed its schema'
            );
            expect(loader).toHaveBeenCalledTimes(2);
            expect(redis.set).toHaveBeenCalledWith(
                key,
                JSON.stringify(entry),
                'PX',
                4000
            );
        });

        it('records one warning, unlinks the key, loads, and sets the loaded value when the entry is not JSON', async () => {
            redis.get.mockResolvedValue('not-json');
            loader.mockResolvedValue(entry);

            const result = await service.readThrough(
                key,
                entrySchema,
                ttlInMs,
                loader
            );

            expect(result).toEqual(entry);
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn).toHaveBeenCalledWith(
                { key, err: expect.any(Error) },
                'Cache entry failed its schema'
            );
            expect(redis.unlink).toHaveBeenCalledWith(key);
            expect(redis.set).toHaveBeenCalledWith(
                key,
                JSON.stringify(entry),
                'PX',
                4000
            );
        });

        it.each(failures)(
            'throws RedisUnavailableException carrying the error when the read fails with %s',
            async (_name, error) => {
                redis.get.mockRejectedValue(error);

                await expect(
                    service.readThrough(key, entrySchema, ttlInMs, loader)
                ).rejects.toMatchObject({
                    ...redisUnavailable,
                    rawError: error,
                });
                expect(loader).not.toHaveBeenCalled();
            }
        );

        it.each(failures)(
            'throws RedisUnavailableException carrying the error when the set fails with %s',
            async (_name, error) => {
                redis.get.mockResolvedValue(null);
                redis.set.mockRejectedValue(error);
                loader.mockResolvedValue(entry);

                await expect(
                    service.readThrough(key, entrySchema, ttlInMs, loader)
                ).rejects.toMatchObject({
                    ...redisUnavailable,
                    rawError: error,
                });
            }
        );

        it.each(failures)(
            'throws RedisUnavailableException carrying the error when the unlink of a corrupt entry fails with %s',
            async (_name, error) => {
                redis.get.mockResolvedValue('not-json');
                redis.unlink.mockRejectedValue(error);

                await expect(
                    service.readThrough(key, entrySchema, ttlInMs, loader)
                ).rejects.toMatchObject({
                    ...redisUnavailable,
                    rawError: error,
                });
                expect(loader).not.toHaveBeenCalled();
            }
        );

        it('propagates a loader error unchanged and records no warning', async () => {
            const failure = new Error('database down');
            redis.get.mockResolvedValue(null);
            loader.mockRejectedValue(failure);

            await expect(
                service.readThrough(key, entrySchema, ttlInMs, loader)
            ).rejects.toBe(failure);
            expect(warn).not.toHaveBeenCalled();
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

        it('sets the entry through the lease script while the lease holds the token', async () => {
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
                expect.stringContaining("redis.call('SET', KEYS[1]"),
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

        it.each(failures)(
            'throws RedisUnavailableException carrying the error before the loader when the lease take fails with %s',
            async (_name, error) => {
                redis.get.mockResolvedValue(null);
                redis.set.mockRejectedValue(error);

                await expect(
                    service.readThrough(key, entrySchema, ttlInMs, loader, {
                        lease,
                    })
                ).rejects.toMatchObject({
                    ...redisUnavailable,
                    rawError: error,
                });
                expect(loader).not.toHaveBeenCalled();
            }
        );

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

        it.each(failures)(
            'throws RedisUnavailableException carrying the error when the script fails with %s',
            async (_name, error) => {
                redis.get.mockResolvedValue(null);
                redis.set.mockResolvedValue('OK');
                redis.eval.mockRejectedValue(error);
                loader.mockResolvedValue(entry);

                await expect(
                    service.readThrough(key, entrySchema, ttlInMs, loader, {
                        lease,
                    })
                ).rejects.toMatchObject({
                    ...redisUnavailable,
                    rawError: error,
                });
            }
        );
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

        it.each(failures)(
            'throws RedisUnavailableException carrying the error on %s',
            async (_name, error) => {
                redis.unlink.mockRejectedValue(error);

                await expect(service.invalidate(keys)).rejects.toMatchObject({
                    ...redisUnavailable,
                    rawError: error,
                });
            }
        );
    });

    describe('flush', () => {
        it('calls flushdb once on the cache connection', async () => {
            redis.flushdb.mockResolvedValue('OK');

            await service.flush();

            expect(redis.flushdb).toHaveBeenCalledTimes(1);
        });

        it.each(failures)(
            'throws RedisUnavailableException carrying the error on %s',
            async (_name, error) => {
                redis.flushdb.mockRejectedValue(error);

                await expect(service.flush()).rejects.toMatchObject({
                    ...redisUnavailable,
                    rawError: error,
                });
            }
        );
    });
});
