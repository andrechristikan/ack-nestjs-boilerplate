import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import { AnalyticAuthTwoFactorAttemptUseCase } from '@modules/analytic/use-cases/analytic.auth-two-factor-attempt.use-case';

describe('AnalyticAuthTwoFactorAttemptUseCase', () => {
    const analyticDashboardService: MockProxy<AnalyticDashboardService> =
        mock<AnalyticDashboardService>();

    let useCase: AnalyticAuthTwoFactorAttemptUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticAuthTwoFactorAttemptUseCase,
                {
                    provide: AnalyticDashboardService,
                    useValue: analyticDashboardService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticAuthTwoFactorAttemptUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDashboardService.authTwoFactorAttempt.mockResolvedValue({
                usersWithAttempts: 2,
                totalAttempts: 5,
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { usersWithAttempts: 2, totalAttempts: 5 },
            });
            expect(
                analyticDashboardService.authTwoFactorAttempt
            ).toHaveBeenCalledWith();
        });
    });
});
