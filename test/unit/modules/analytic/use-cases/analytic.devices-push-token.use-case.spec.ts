import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDeviceService } from '@modules/analytic/services/analytic.device.service';
import { AnalyticDevicesPushTokenUseCase } from '@modules/analytic/use-cases/analytic.devices-push-token.use-case';

describe('AnalyticDevicesPushTokenUseCase', () => {
    const analyticDeviceService: MockProxy<AnalyticDeviceService> =
        mock<AnalyticDeviceService>();

    let useCase: AnalyticDevicesPushTokenUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDevicesPushTokenUseCase,
                {
                    provide: AnalyticDeviceService,
                    useValue: analyticDeviceService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticDevicesPushTokenUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDeviceService.devicesPushToken.mockResolvedValue({
                count: 4,
                total: 10,
                rate: 0.4,
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { count: 4, total: 10, rate: 0.4 },
            });
            expect(
                analyticDeviceService.devicesPushToken
            ).toHaveBeenCalledWith();
        });
    });
});
