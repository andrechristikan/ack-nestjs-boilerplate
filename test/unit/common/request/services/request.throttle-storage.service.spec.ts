import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { CacheService } from '@common/cache/services/cache.service';
import { RedisCacheClient } from '@common/redis/constants/redis.constant';
import { EnumRedisStatusCodeError } from '@common/redis/enums/redis.status-code.enum';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RequestThrottleResponseInvalidException } from '@common/request/exceptions/request.throttle-response-invalid.exception';
import { RequestThrottleStorageService } from '@common/request/services/request.throttle-storage.service';
import type { IStubCacheClient } from '@test/unit/helpers/test.unit.cache.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('RequestThrottleStorageService', () => {
    let configService: MockProxy<ConfigService>;
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const failOpenRecord = {
        totalHits: 0,
        timeToExpire: 0,
        isBlocked: false,
        timeToBlockExpire: 0,
    };
    const redis: MockProxy<IStubCacheClient> = mock<IStubCacheClient>();

    let service: RequestThrottleStorageService;

    beforeEach(async () => {
        configService = buildConfigService({
            'request.throttle.keyPattern': 'Throttle:{name}:{tracker}',
            'request.throttle.blockKeyPattern':
                'ThrottleBlock:{name}:{tracker}',
            'request.throttle.sequenceKeyPattern':
                'ThrottleSeq:{name}:{tracker}',
        });
        cacheService.isConnectionError.mockReturnValue(false);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestThrottleStorageService,
                { provide: RedisCacheClient, useValue: redis },
                { provide: ConfigService, useValue: configService },
                HelperStringService,
                { provide: CacheService, useValue: cacheService },
            ],
        }).compile();

        service = module.get(RequestThrottleStorageService);
    });

    describe('increment', () => {
        it('builds the three keys and evaluates the script with the given arguments', async () => {
            redis.eval.mockResolvedValue([1, 500, 0, 0]);

            await service.increment('tracker-1', 1000, 5, 2000, 'default');

            expect(redis.eval).toHaveBeenCalledWith(
                expect.any(String),
                3,
                'Throttle:default:tracker-1',
                'ThrottleBlock:default:tracker-1',
                'ThrottleSeq:default:tracker-1',
                '1000',
                '5',
                '2000'
            );
        });

        it('returns an unblocked record with seconds rounded up from the script result', async () => {
            redis.eval.mockResolvedValue([1, 500, 0, 0]);

            const result = await service.increment(
                'tracker-1',
                1000,
                5,
                2000,
                'default'
            );

            expect(result).toEqual({
                totalHits: 1,
                timeToExpire: 1,
                isBlocked: false,
                timeToBlockExpire: 0,
            });
        });

        it('returns a blocked record with the block expiry in seconds', async () => {
            redis.eval.mockResolvedValue([6, 0, 1, 1500]);

            const result = await service.increment(
                'tracker-1',
                1000,
                5,
                2000,
                'default'
            );

            expect(result).toEqual({
                totalHits: 6,
                timeToExpire: 0,
                isBlocked: true,
                timeToBlockExpire: 2,
            });
        });

        it('fails open and warns once per throttler when the script result is not an array', async () => {
            redis.eval.mockResolvedValue('not-an-array');

            const result = await service.increment(
                'tracker-1',
                1000,
                5,
                2000,
                'default'
            );

            expect(result).toEqual(failOpenRecord);
            expect(cacheService.warnOnce).toHaveBeenCalledWith(
                'default',
                new RequestThrottleResponseInvalidException('not-an-array'),
                'Throttler got an invalid response, allowing request'
            );
        });

        it('fails open and warns once per throttler when the script result is too short', async () => {
            redis.eval.mockResolvedValue([1, 2, 0]);

            const result = await service.increment(
                'tracker-1',
                1000,
                5,
                2000,
                'default'
            );

            expect(result).toEqual(failOpenRecord);
            expect(cacheService.warnOnce).toHaveBeenCalledWith(
                'default',
                new RequestThrottleResponseInvalidException([1, 2, 0]),
                'Throttler got an invalid response, allowing request'
            );
        });

        it('fails open and warns once per throttler when a script result value is non-numeric', async () => {
            redis.eval.mockResolvedValue([1, 'nope', 0, 0]);

            const result = await service.increment(
                'tracker-1',
                1000,
                5,
                2000,
                'default'
            );

            expect(result).toEqual(failOpenRecord);
            expect(cacheService.warnOnce).toHaveBeenCalledWith(
                'default',
                new RequestThrottleResponseInvalidException([1, 'nope', 0, 0]),
                'Throttler got a non-numeric value, allowing request'
            );
        });

        it('throws RedisUnavailableException carrying the caught error as rawError when the client rejects with a connection error', async () => {
            const error = new Error('Connection is closed.');
            redis.eval.mockRejectedValue(error);
            cacheService.isConnectionError.mockReturnValue(true);

            await expect(
                service.increment('tracker-1', 1000, 5, 2000, 'default')
            ).rejects.toMatchObject({
                module: 'redis',
                statusCode: EnumRedisStatusCodeError.unavailable,
                rawError: error,
            });
            expect(cacheService.isConnectionError).toHaveBeenCalledWith(error);
            expect(cacheService.warnOnce).not.toHaveBeenCalled();
        });

        it('fails open and warns once per throttler when the client rejects with any other error', async () => {
            const error = new Error('ERR Error running script');
            redis.eval.mockRejectedValue(error);

            const result = await service.increment(
                'tracker-1',
                1000,
                5,
                2000,
                'default'
            );

            expect(result).toEqual(failOpenRecord);
            expect(cacheService.isConnectionError).toHaveBeenCalledWith(error);
            expect(cacheService.warnOnce).toHaveBeenCalledWith(
                'default',
                error,
                'Throttler storage failed, allowing request'
            );
        });

        it('fails open and warns once per throttler when the client rejects with a non-Error value', async () => {
            redis.eval.mockRejectedValue('script failed');

            const result = await service.increment(
                'tracker-1',
                1000,
                5,
                2000,
                'default'
            );

            expect(result).toEqual(failOpenRecord);
            expect(cacheService.isConnectionError).toHaveBeenCalledWith(
                'script failed'
            );
            expect(cacheService.warnOnce).toHaveBeenCalledWith(
                'default',
                'script failed',
                'Throttler storage failed, allowing request'
            );
        });
    });

    describe('buildKey', () => {
        it('fills the given pattern with the throttler name and tracker', () => {
            const result = service['buildKey'](
                'Throttle:{name}:{tracker}',
                'default',
                'tracker-1'
            );

            expect(result).toBe('Throttle:default:tracker-1');
        });
    });

    describe('failOpenRecord', () => {
        it('answers a zeroed, unblocked throttler record', () => {
            expect(service['failOpenRecord']()).toEqual({
                totalHits: 0,
                timeToExpire: 0,
                isBlocked: false,
                timeToBlockExpire: 0,
            });
        });
    });

    describe('toSeconds', () => {
        it('rounds a positive millisecond value up to the next second', () => {
            expect(service['toSeconds'](1500)).toBe(2);
        });

        it('answers zero for a zero or negative millisecond value', () => {
            expect(service['toSeconds'](0)).toBe(0);
            expect(service['toSeconds'](-100)).toBe(0);
        });
    });
});
