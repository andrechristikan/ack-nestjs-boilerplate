import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type KeyvRedis from '@keyv/redis';
import type Keyv from 'keyv';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RedisClientCachedProvider } from '@common/redis/constants/redis.constant';
import { RequestThrottleStorageService } from '@common/request/services/request.throttle-storage.service';

describe('RequestThrottleStorageService', () => {
    const evalScript = vi.fn();
    const keyvStore: MockProxy<KeyvRedis<string>> = mock<KeyvRedis<string>>();
    const keyv: MockProxy<Keyv> = mock<Keyv>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();

    let service: RequestThrottleStorageService;

    beforeEach(async () => {
        vi.resetAllMocks();
        keyv.store = keyvStore;
        keyvStore.getClient.mockResolvedValue({
            eval: evalScript,
        } as unknown as Awaited<ReturnType<KeyvRedis<string>['getClient']>>);
        helperStringService.fillPattern.mockImplementation((pattern, values) =>
            pattern.replace(
                /\{(\w+)\}/g,
                (_match, token: string) => values[token]
            )
        );
        vi.mocked(configService.get).mockImplementation(key => {
            const values: Record<string, string> = {
                'request.throttle.keyPattern': 'Throttle:{name}:{tracker}',
                'request.throttle.blockKeyPattern':
                    'ThrottleBlock:{name}:{tracker}',
                'request.throttle.sequenceKeyPattern':
                    'ThrottleSequence:{name}:{tracker}',
            };
            return values[key];
        });
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RequestThrottleStorageService,
                { provide: RedisClientCachedProvider, useValue: keyv },
                { provide: ConfigService, useValue: configService },
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();
        service = moduleRef.get(RequestThrottleStorageService);
    });

    it('maps Redis millisecond counters to the throttler record in seconds', async () => {
        evalScript.mockResolvedValue([3, 1_001, 1, 2_001]);

        await expect(
            service.increment('user-id', 60_000, 2, 30_000, 'user')
        ).resolves.toEqual({
            totalHits: 3,
            timeToExpire: 2,
            isBlocked: true,
            timeToBlockExpire: 3,
        });
        expect(evalScript).toHaveBeenCalledWith(expect.any(String), {
            keys: [
                'Throttle:user:user-id',
                'ThrottleBlock:user:user-id',
                'ThrottleSequence:user:user-id',
            ],
            arguments: ['60000', '2', '30000'],
        });
    });

    it.each([
        ['invalid shape', ['bad']],
        ['non-numeric values', [1, 'bad', 0, 0]],
    ])('fails open for %s', async (_condition, result) => {
        evalScript.mockResolvedValue(result);

        await expect(
            service.increment('user-id', 60_000, 2, 30_000, 'user')
        ).resolves.toEqual({
            totalHits: 0,
            timeToExpire: 0,
            isBlocked: false,
            timeToBlockExpire: 0,
        });
    });

    it('fails open when Redis is unavailable', async () => {
        keyvStore.getClient.mockRejectedValue(new Error('redis unavailable'));

        await expect(
            service.increment('user-id', 60_000, 2, 30_000, 'user')
        ).resolves.toMatchObject({ totalHits: 0, isBlocked: false });
    });
});
