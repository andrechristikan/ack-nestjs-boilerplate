import { ConfigService } from '@nestjs/config';
import type Keyv from 'keyv';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestThrottlerStorageService } from '@common/request/services/request.throttler.service';

describe('RequestThrottlerStorageService', () => {
    const evalScript = vi.fn();
    const getClient = vi.fn(() => ({ eval: evalScript }));
    const keyv = { store: { getClient } } as unknown as Keyv;
    const configService: Pick<ConfigService, 'get'> = { get: vi.fn() };
    const configGet = vi.mocked(configService.get);

    let service: RequestThrottlerStorageService;

    beforeEach(() => {
        vi.resetAllMocks();
        getClient.mockReturnValue({ eval: evalScript });
        configGet.mockImplementation(key => {
            const values: Record<string, string> = {
                'request.throttle.keyPattern': 'Throttle:{name}:{tracker}',
                'request.throttle.blockKeyPattern':
                    'ThrottleBlock:{name}:{tracker}',
                'request.throttle.sequenceKeyPattern':
                    'ThrottleSequence:{name}:{tracker}',
            };
            return values[key];
        });
        service = new RequestThrottlerStorageService(
            keyv,
            configService as ConfigService
        );
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
        getClient.mockRejectedValue(new Error('redis unavailable'));

        await expect(
            service.increment('user-id', 60_000, 2, 30_000, 'user')
        ).resolves.toMatchObject({ totalHits: 0, isBlocked: false });
    });
});
