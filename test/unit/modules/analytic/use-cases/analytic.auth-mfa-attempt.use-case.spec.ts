import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticAuthService } from '@modules/analytic/services/analytic.auth.service';
import { AnalyticAuthMfaAttemptUseCase } from '@modules/analytic/use-cases/analytic.auth-mfa-attempt.use-case';

describe('AnalyticAuthMfaAttemptUseCase', () => {
    const analyticAuthService: MockProxy<AnalyticAuthService> =
        mock<AnalyticAuthService>();

    let useCase: AnalyticAuthMfaAttemptUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticAuthMfaAttemptUseCase,
                {
                    provide: AnalyticAuthService,
                    useValue: analyticAuthService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticAuthMfaAttemptUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticAuthService.authMfaAttempt.mockResolvedValue({
                usersWithAttempts: 2,
                totalAttempts: 5,
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { usersWithAttempts: 2, totalAttempts: 5 },
            });
            expect(analyticAuthService.authMfaAttempt).toHaveBeenCalledWith();
        });
    });
});
