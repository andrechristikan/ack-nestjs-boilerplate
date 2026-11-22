import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDeviceService } from '@modules/analytic/services/analytic.device.service';
import { AnalyticDevicePerUserUseCase } from '@modules/analytic/use-cases/analytic.device-per-user.use-case';

describe('AnalyticDevicePerUserUseCase', () => {
    const analyticDeviceService: MockProxy<AnalyticDeviceService> =
        mock<AnalyticDeviceService>();

    let useCase: AnalyticDevicePerUserUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDevicePerUserUseCase,
                {
                    provide: AnalyticDeviceService,
                    useValue: analyticDeviceService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticDevicePerUserUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDeviceService.getDevicePerUser.mockResolvedValue({
                buckets: [{ key: 'key-1', count: 7 }],
                computedAt: null,
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: {
                    buckets: [{ key: 'key-1', count: 7 }],
                    computedAt: null,
                },
            });
            expect(
                analyticDeviceService.getDevicePerUser
            ).toHaveBeenCalledWith();
        });
    });
});
