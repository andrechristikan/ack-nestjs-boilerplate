import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type Keyv from 'keyv';
import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RequestThrottleStorageService } from '@common/request/services/request.throttle-storage.service';

describe('RequestThrottleStorageService', () => {
    const configGet = vi.fn<(key: string) => string>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const redisClient = { eval: vi.fn() };
    const keyv = { store: { getClient: vi.fn() } } as unknown as Keyv;

    let service: RequestThrottleStorageService;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            const values: Record<string, string> = {
                'request.throttle.keyPattern': 'Throttle:{name}:{tracker}',
                'request.throttle.blockKeyPattern':
                    'ThrottleBlock:{name}:{tracker}',
                'request.throttle.sequenceKeyPattern':
                    'ThrottleSeq:{name}:{tracker}',
            };
            return values[key];
        });
        helperStringService.fillPattern.mockImplementation(
            (pattern, tokens) => `${pattern}::${tokens.name}::${tokens.tracker}`
        );
        (
            keyv.store as unknown as { getClient: ReturnType<typeof vi.fn> }
        ).getClient.mockResolvedValue(redisClient);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestThrottleStorageService,
                { provide: RedisClientCachedProvider, useValue: keyv },
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
            ],
        }).compile();

        service = module.get(RequestThrottleStorageService);
    });

    describe('increment', () => {
        it('builds the three keys and evaluates the script with the given arguments', async () => {
            redisClient.eval.mockResolvedValue([1, 500, 0, 0]);

            await service.increment('tracker-1', 1000, 5, 2000, 'default');

            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Throttle:{name}:{tracker}',
                { name: 'default', tracker: 'tracker-1' }
            );
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'ThrottleBlock:{name}:{tracker}',
                { name: 'default', tracker: 'tracker-1' }
            );
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'ThrottleSeq:{name}:{tracker}',
                { name: 'default', tracker: 'tracker-1' }
            );
            expect(redisClient.eval).toHaveBeenCalledWith(expect.any(String), {
                keys: [
                    'Throttle:{name}:{tracker}::default::tracker-1',
                    'ThrottleBlock:{name}:{tracker}::default::tracker-1',
                    'ThrottleSeq:{name}:{tracker}::default::tracker-1',
                ],
                arguments: ['1000', '5', '2000'],
            });
        });

        it('returns an unblocked record with seconds rounded up from the script result', async () => {
            redisClient.eval.mockResolvedValue([1, 500, 0, 0]);

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
            redisClient.eval.mockResolvedValue([6, 0, 1, 1500]);

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

        it('fails open when the script result is not an array', async () => {
            redisClient.eval.mockResolvedValue('not-an-array');

            const result = await service.increment(
                'tracker-1',
                1000,
                5,
                2000,
                'default'
            );

            expect(result).toEqual({
                totalHits: 0,
                timeToExpire: 0,
                isBlocked: false,
                timeToBlockExpire: 0,
            });
        });

        it('fails open when the script result is too short', async () => {
            redisClient.eval.mockResolvedValue([1, 2, 0]);

            const result = await service.increment(
                'tracker-1',
                1000,
                5,
                2000,
                'default'
            );

            expect(result).toEqual({
                totalHits: 0,
                timeToExpire: 0,
                isBlocked: false,
                timeToBlockExpire: 0,
            });
        });

        it('fails open when a script result value is non-numeric', async () => {
            redisClient.eval.mockResolvedValue([1, 'nope', 0, 0]);

            const result = await service.increment(
                'tracker-1',
                1000,
                5,
                2000,
                'default'
            );

            expect(result).toEqual({
                totalHits: 0,
                timeToExpire: 0,
                isBlocked: false,
                timeToBlockExpire: 0,
            });
        });

        it('fails open when the redis client rejects with an Error', async () => {
            redisClient.eval.mockRejectedValue(new Error('connection lost'));

            const result = await service.increment(
                'tracker-1',
                1000,
                5,
                2000,
                'default'
            );

            expect(result).toEqual({
                totalHits: 0,
                timeToExpire: 0,
                isBlocked: false,
                timeToBlockExpire: 0,
            });
        });

        it('fails open when the redis client rejects with a non-Error value', async () => {
            redisClient.eval.mockRejectedValue('connection lost');

            const result = await service.increment(
                'tracker-1',
                1000,
                5,
                2000,
                'default'
            );

            expect(result).toEqual({
                totalHits: 0,
                timeToExpire: 0,
                isBlocked: false,
                timeToBlockExpire: 0,
            });
        });
    });

    describe('private: buildKey', () => {
        it('fills the given pattern with the throttler name and tracker', () => {
            helperStringService.fillPattern.mockReturnValue('built-key');

            const result = service['buildKey'](
                'Throttle:{name}:{tracker}',
                'default',
                'tracker-1'
            );

            expect(result).toBe('built-key');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Throttle:{name}:{tracker}',
                { name: 'default', tracker: 'tracker-1' }
            );
        });
    });

    describe('private: getClient', () => {
        it('resolves the redis client through the keyv store', async () => {
            await expect(service['getClient']()).resolves.toBe(redisClient);
        });
    });

    describe('private: failOpenRecord', () => {
        it('answers a zeroed, unblocked throttler record', () => {
            expect(service['failOpenRecord']()).toEqual({
                totalHits: 0,
                timeToExpire: 0,
                isBlocked: false,
                timeToBlockExpire: 0,
            });
        });
    });

    describe('private: toSeconds', () => {
        it('rounds a positive millisecond value up to the next second', () => {
            expect(service['toSeconds'](1500)).toBe(2);
        });

        it('answers zero for a zero or negative millisecond value', () => {
            expect(service['toSeconds'](0)).toBe(0);
            expect(service['toSeconds'](-100)).toBe(0);
        });
    });
});
