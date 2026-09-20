import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { ThrottlerException } from '@nestjs/throttler';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IRequestThrottlePolicy } from '@common/request/interfaces/request.interface';
import { RequestThrottleService } from '@common/request/services/request.throttle.service';
import { RequestThrottleStorageService } from '@common/request/services/request.throttle-storage.service';
import type { Response } from 'express';

describe('RequestThrottleService', () => {
    const configService: Pick<ConfigService, 'get'> = { get: vi.fn() };
    const configGet = vi.mocked(configService.get);
    const storageService = {
        increment: vi.fn<RequestThrottleStorageService['increment']>(),
    } satisfies Pick<RequestThrottleStorageService, 'increment'>;
    const setHeader = vi.fn<Response['setHeader']>();
    const response = createMock<Response>({ setHeader });
    const policy: IRequestThrottlePolicy = {
        ttlInMs: 60_000,
        limit: 10,
        blockDurationInMs: 30_000,
    };

    let service: RequestThrottleService;

    beforeEach(() => {
        vi.resetAllMocks();
        configGet.mockReturnValue('X-RateLimit');

        service = new RequestThrottleService(
            configService as ConfigService,
            storageService as unknown as RequestThrottleStorageService
        );
    });

    it('sets limiter headers from a successful storage record', async () => {
        storageService.increment.mockResolvedValue({
            totalHits: 3,
            timeToExpire: 42,
            isBlocked: false,
            timeToBlockExpire: 0,
        });

        await service.evaluate(response, 'user', 'user-id', policy);

        expect(storageService.increment).toHaveBeenCalledWith(
            'user-id',
            60_000,
            10,
            30_000,
            'user'
        );
        expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Limit-user', 10);
        expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining-user', 7);
        expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Reset-user', 42);
    });

    it('sets Retry-After and rejects a blocked request', async () => {
        storageService.increment.mockResolvedValue({
            totalHits: 11,
            timeToExpire: 20,
            isBlocked: true,
            timeToBlockExpire: 15,
        });

        await expect(
            service.evaluate(response, 'route', 'route-key', policy)
        ).rejects.toBeInstanceOf(ThrottlerException);
        expect(setHeader).toHaveBeenCalledWith('Retry-After', 15);
    });

    it('propagates a storage failure', async () => {
        storageService.increment.mockRejectedValue(
            new Error('redis unavailable')
        );

        await expect(
            service.evaluate(response, 'user', 'user-id', policy)
        ).rejects.toThrow('redis unavailable');
        expect(setHeader).not.toHaveBeenCalled();
    });
});
