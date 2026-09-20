import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ThrottlerException } from '@nestjs/throttler';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import type { IRequestThrottlePolicy } from '@common/request/interfaces/request.interface';
import { RequestThrottleService } from '@common/request/services/request.throttle.service';
import { RequestThrottleStorageService } from '@common/request/services/request.throttle-storage.service';
import type { Response } from 'express';

describe('RequestThrottleService', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const requestThrottleStorageService: MockProxy<RequestThrottleStorageService> =
        mock<RequestThrottleStorageService>();
    const response: MockProxy<Response> = mock<Response>();
    const policy: IRequestThrottlePolicy = {
        ttlInMs: 60_000,
        limit: 10,
        blockDurationInMs: 30_000,
    };

    let service: RequestThrottleService;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.mocked(configService.get).mockReturnValue('X-RateLimit');

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RequestThrottleService,
                { provide: ConfigService, useValue: configService },
                {
                    provide: RequestThrottleStorageService,
                    useValue: requestThrottleStorageService,
                },
            ],
        }).compile();
        service = moduleRef.get(RequestThrottleService);
    });

    it('sets limiter headers from a successful storage record', async () => {
        requestThrottleStorageService.increment.mockResolvedValue({
            totalHits: 3,
            timeToExpire: 42,
            isBlocked: false,
            timeToBlockExpire: 0,
        });

        await service.evaluate(response, 'user', 'user-id', policy);

        expect(requestThrottleStorageService.increment).toHaveBeenCalledWith(
            'user-id',
            60_000,
            10,
            30_000,
            'user'
        );
        expect(response.setHeader).toHaveBeenCalledWith(
            'X-RateLimit-Limit-user',
            10
        );
        expect(response.setHeader).toHaveBeenCalledWith(
            'X-RateLimit-Remaining-user',
            7
        );
        expect(response.setHeader).toHaveBeenCalledWith(
            'X-RateLimit-Reset-user',
            42
        );
    });

    it('sets Retry-After and rejects a blocked request', async () => {
        requestThrottleStorageService.increment.mockResolvedValue({
            totalHits: 11,
            timeToExpire: 20,
            isBlocked: true,
            timeToBlockExpire: 15,
        });

        await expect(
            service.evaluate(response, 'route', 'route-key', policy)
        ).rejects.toBeInstanceOf(ThrottlerException);
        expect(response.setHeader).toHaveBeenCalledWith('Retry-After', 15);
    });

    it('propagates a storage failure', async () => {
        requestThrottleStorageService.increment.mockRejectedValue(
            new Error('redis unavailable')
        );

        await expect(
            service.evaluate(response, 'user', 'user-id', policy)
        ).rejects.toThrow('redis unavailable');
        expect(response.setHeader).not.toHaveBeenCalled();
    });
});
