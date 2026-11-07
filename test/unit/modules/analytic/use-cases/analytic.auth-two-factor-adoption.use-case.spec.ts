import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import { AnalyticAuthTwoFactorAdoptionUseCase } from '@modules/analytic/use-cases/analytic.auth-two-factor-adoption.use-case';

describe('AnalyticAuthTwoFactorAdoptionUseCase', () => {
    const analyticDashboardService: MockProxy<AnalyticDashboardService> =
        mock<AnalyticDashboardService>();

    let useCase: AnalyticAuthTwoFactorAdoptionUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticAuthTwoFactorAdoptionUseCase,
                {
                    provide: AnalyticDashboardService,
                    useValue: analyticDashboardService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticAuthTwoFactorAdoptionUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardService.authTwoFactorAdoption.mockResolvedValue({
                enabled: 3,
                total: 9,
                rate: 0.33,
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { enabled: 3, total: 9, rate: 0.33 },
            });
            expect(
                analyticDashboardService.authTwoFactorAdoption
            ).toHaveBeenCalledWith();
        });
    });
});
