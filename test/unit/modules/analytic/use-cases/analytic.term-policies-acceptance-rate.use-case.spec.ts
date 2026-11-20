import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticTermPolicyService } from '@modules/analytic/services/analytic.term-policy.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticTermPoliciesAcceptanceRateUseCase } from '@modules/analytic/use-cases/analytic.term-policies-acceptance-rate.use-case';

describe('AnalyticTermPoliciesAcceptanceRateUseCase', () => {
    const analyticTermPolicyService: MockProxy<AnalyticTermPolicyService> =
        mock<AnalyticTermPolicyService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticTermPoliciesAcceptanceRateUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticTermPoliciesAcceptanceRateUseCase,
                {
                    provide: AnalyticTermPolicyService,
                    useValue: analyticTermPolicyService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticTermPoliciesAcceptanceRateUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticTermPolicyService.termPoliciesAcceptanceRate.mockResolvedValue(
                { acceptances: 4, users: 8, published: 2, rate: 0.5 }
            );

            const result = await useCase.execute({
                startDate,
                endDate,
            });

            expect(analyticDateService.optionalRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );

            expect(result).toEqual({
                data: { acceptances: 4, users: 8, published: 2, rate: 0.5 },
            });
            expect(
                analyticTermPolicyService.termPoliciesAcceptanceRate
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes null dates when the optional range is empty', async () => {
            analyticDateService.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            analyticTermPolicyService.termPoliciesAcceptanceRate.mockResolvedValue(
                { acceptances: 4, users: 8, published: 2, rate: 0.5 }
            );

            await useCase.execute({});

            expect(analyticDateService.optionalRange).toHaveBeenCalledWith(
                null,
                null
            );

            expect(
                analyticTermPolicyService.termPoliciesAcceptanceRate
            ).toHaveBeenCalledWith(null, null);
        });
    });
});
