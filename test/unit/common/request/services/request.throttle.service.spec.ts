import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ThrottlerException } from '@nestjs/throttler';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Response } from 'express';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface.js';
import { EnumRequestThrottleName } from '@common/request/enums/request.enum';
import type { IRequestThrottlePolicy } from '@common/request/interfaces/request.interface';
import { RequestThrottleStorageService } from '@common/request/services/request.throttle-storage.service';
import { RequestThrottleService } from '@common/request/services/request.throttle.service';

describe('RequestThrottleService', () => {
    const storageService: MockProxy<RequestThrottleStorageService> =
        mock<RequestThrottleStorageService>();

    let service: RequestThrottleService;
    let response: MockProxy<Response>;

    const policy: IRequestThrottlePolicy = {
        ttlInMs: 1000,
        limit: 5,
        blockDurationInMs: 2000,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestThrottleService,
                {
                    provide: RequestThrottleStorageService,
                    useValue: storageService,
                },
            ],
        }).compile();

        service = module.get(RequestThrottleService);
        response = mock<Response>();
    });

    describe('evaluate', () => {
        it('sets rate-limit headers when the request is under the limit', async () => {
            const record: ThrottlerStorageRecord = {
                totalHits: 2,
                timeToExpire: 30,
                isBlocked: false,
                timeToBlockExpire: 0,
            };
            storageService.increment.mockResolvedValue(record);

            await service.evaluate(
                response,
                EnumRequestThrottleName.default,
                'tracker-1',
                policy
            );

            expect(storageService.increment).toHaveBeenCalledWith(
                'tracker-1',
                policy.ttlInMs,
                policy.limit,
                policy.blockDurationInMs,
                EnumRequestThrottleName.default
            );
            expect(response.setHeader).toHaveBeenCalledWith(
                'X-RateLimit-Limit-default',
                5
            );
            expect(response.setHeader).toHaveBeenCalledWith(
                'X-RateLimit-Remaining-default',
                3
            );
            expect(response.setHeader).toHaveBeenCalledWith(
                'X-RateLimit-Reset-default',
                30
            );
            expect(response.setHeader).not.toHaveBeenCalledWith(
                'Retry-After',
                expect.anything()
            );
        });

        it('clamps remaining to zero when hits exceed the limit', async () => {
            const record: ThrottlerStorageRecord = {
                totalHits: 9,
                timeToExpire: 10,
                isBlocked: false,
                timeToBlockExpire: 0,
            };
            storageService.increment.mockResolvedValue(record);

            await service.evaluate(
                response,
                EnumRequestThrottleName.default,
                'tracker-1',
                policy
            );

            expect(response.setHeader).toHaveBeenCalledWith(
                'X-RateLimit-Remaining-default',
                0
            );
        });

        it('sets Retry-After and throws when the record is blocked', async () => {
            const record: ThrottlerStorageRecord = {
                totalHits: 6,
                timeToExpire: 0,
                isBlocked: true,
                timeToBlockExpire: 45,
            };
            storageService.increment.mockResolvedValue(record);

            await expect(
                service.evaluate(
                    response,
                    EnumRequestThrottleName.default,
                    'tracker-1',
                    policy
                )
            ).rejects.toBeInstanceOf(ThrottlerException);

            expect(response.setHeader).toHaveBeenCalledWith('Retry-After', 45);
            expect(response.setHeader).not.toHaveBeenCalledWith(
                'X-RateLimit-Limit-default',
                expect.anything()
            );
        });
    });
});
