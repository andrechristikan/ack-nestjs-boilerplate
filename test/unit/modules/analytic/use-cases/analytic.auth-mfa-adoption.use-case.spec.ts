import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import { AnalyticAuthMfaAdoptionUseCase } from '@modules/analytic/use-cases/analytic.auth-mfa-adoption.use-case';

describe('AnalyticAuthMfaAdoptionUseCase', () => {
    const analyticDashboardService: MockProxy<AnalyticDashboardService> =
        mock<AnalyticDashboardService>();

    let useCase: AnalyticAuthMfaAdoptionUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticAuthMfaAdoptionUseCase,
                {
                    provide: AnalyticDashboardService,
                    useValue: analyticDashboardService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticAuthMfaAdoptionUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardService.authMfaAdoption.mockResolvedValue({
                enabled: 3,
                total: 9,
                rate: 0.33,
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { enabled: 3, total: 9, rate: 0.33 },
            });
            expect(
                analyticDashboardService.authMfaAdoption
            ).toHaveBeenCalledWith();
        });
    });
});
