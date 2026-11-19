import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticAuthService } from '@modules/analytic/services/analytic.auth.service';
import { AnalyticAuthMfaAdoptionUseCase } from '@modules/analytic/use-cases/analytic.auth-mfa-adoption.use-case';

describe('AnalyticAuthMfaAdoptionUseCase', () => {
    const analyticAuthService: MockProxy<AnalyticAuthService> =
        mock<AnalyticAuthService>();

    let useCase: AnalyticAuthMfaAdoptionUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticAuthMfaAdoptionUseCase,
                {
                    provide: AnalyticAuthService,
                    useValue: analyticAuthService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticAuthMfaAdoptionUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticAuthService.authMfaAdoption.mockResolvedValue({
                enabled: 3,
                total: 9,
                rate: 0.33,
                computedAt: null,
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: { enabled: 3, total: 9, rate: 0.33, computedAt: null },
            });
            expect(analyticAuthService.authMfaAdoption).toHaveBeenCalledWith();
        });
    });
});
