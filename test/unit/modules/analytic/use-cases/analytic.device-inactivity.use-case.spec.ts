import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDeviceService } from '@modules/analytic/services/analytic.device.service';
import { AnalyticDeviceInactivityUseCase } from '@modules/analytic/use-cases/analytic.device-inactivity.use-case';

describe('AnalyticDeviceInactivityUseCase', () => {
    const analyticDeviceService: MockProxy<AnalyticDeviceService> =
        mock<AnalyticDeviceService>();

    let useCase: AnalyticDeviceInactivityUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticDeviceInactivityUseCase,
                {
                    provide: AnalyticDeviceService,
                    useValue: analyticDeviceService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticDeviceInactivityUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDeviceService.getDeviceInactivity.mockResolvedValue({
                count: 12,
            });

            const result = await useCase.execute();

            expect(result).toEqual({ data: { count: 12 } });
            expect(
                analyticDeviceService.getDeviceInactivity
            ).toHaveBeenCalledWith();
        });
    });
});
