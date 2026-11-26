import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { MockInstance } from 'vitest';
import { RedisCacheClient } from '@common/redis/constants/redis.constant';
import { EnumRedisStatusCodeError } from '@common/redis/enums/redis.status-code.enum';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RequestThrottleResponseInvalidException } from '@common/request/exceptions/request.throttle-response-invalid.exception';
import { RequestThrottleStorageService } from '@common/request/services/request.throttle-storage.service';
import type { IStubCacheClient } from '@test/unit/helpers/test.unit.cache.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('RequestThrottleStorageService', () => {
    let configService: MockProxy<ConfigService>;
    const failOpenRecord = {
        totalHits: 0,
        timeToExpire: 0,
        isBlocked: false,
        timeToBlockExpire: 0,
    };
    const redis: MockProxy<IStubCacheClient> = mock<IStubCacheClient>();

    let service: RequestThrottleStorageService;
    let warn: MockInstance<Logger['warn']>;

    beforeEach(async () => {
        configService = buildConfigService({
            'request.throttle.keyPattern': 'Throttle:{name}:{tracker}',
            'request.throttle.blockKeyPattern':
                'ThrottleBlock:{name}:{tracker}',
            'request.throttle.sequenceKeyPattern':
                'ThrottleSeq:{name}:{tracker}',
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestThrottleStorageService,
                { provide: RedisCacheClient, useValue: redis },
                { provide: ConfigService, useValue: configService },
                HelperStringService,
            ],
        }).compile();

        warn = vi.spyOn(Logger.prototype, 'warn');
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

        it('fails open and warns on every call when the script result is not an array', async () => {
            redis.eval.mockResolvedValue('not-an-array');

            const first = await service.increment(
                'tracker-1',
                1000,
                5,
                2000,
                'default'
            );
            const result = await service.increment(
                'tracker-1',
                1000,
                5,
                2000,
                'default'
            );

            expect(first).toEqual(failOpenRecord);
            expect(result).toEqual(failOpenRecord);
            expect(warn).toHaveBeenCalledTimes(2);
            expect(warn).toHaveBeenCalledWith(
                {
                    key: 'default',
                    err: new RequestThrottleResponseInvalidException(
                        'not-an-array'
                    ),
                },
                'Throttler got an invalid response, allowing request'
            );
        });

        it('fails open and warns on every call when the script result is too short', async () => {
            redis.eval.mockResolvedValue([1, 2, 0]);

            const first = await service.increment(
                'tracker-1',
                1000,
                5,
                2000,
                'default'
            );
            const result = await service.increment(
                'tracker-1',
                1000,
                5,
                2000,
                'default'
            );

            expect(first).toEqual(failOpenRecord);
            expect(result).toEqual(failOpenRecord);
            expect(warn).toHaveBeenCalledTimes(2);
            expect(warn).toHaveBeenCalledWith(
                {
                    key: 'default',
                    err: new RequestThrottleResponseInvalidException([1, 2, 0]),
                },
                'Throttler got an invalid response, allowing request'
            );
        });

        it('fails open and warns on every call when a script result value is non-numeric', async () => {
            redis.eval.mockResolvedValue([1, 'nope', 0, 0]);

            const first = await service.increment(
                'tracker-1',
                1000,
                5,
                2000,
                'default'
            );
            const result = await service.increment(
                'tracker-1',
                1000,
                5,
                2000,
                'default'
            );

            expect(first).toEqual(failOpenRecord);
            expect(result).toEqual(failOpenRecord);
            expect(warn).toHaveBeenCalledTimes(2);
            expect(warn).toHaveBeenCalledWith(
                {
                    key: 'default',
                    err: new RequestThrottleResponseInvalidException([
                        1,
                        'nope',
                        0,
                        0,
                    ]),
                },
                'Throttler got a non-numeric value, allowing request'
            );
        });

        it.each([
            ['a connection error', new Error('Connection is closed.')],
            ['a script error', new Error('ERR Error running script')],
            ['a non-Error value', 'script failed'],
        ])(
            'throws RedisUnavailableException carrying the rejection when the client rejects with %s',
            async (_name, error) => {
                redis.eval.mockRejectedValue(error);

                await expect(
                    service.increment('tracker-1', 1000, 5, 2000, 'default')
                ).rejects.toMatchObject({
                    module: 'redis',
                    statusCode: EnumRedisStatusCodeError.unavailable,
                    rawError: error,
                });
                expect(warn).not.toHaveBeenCalled();
            }
        );
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
