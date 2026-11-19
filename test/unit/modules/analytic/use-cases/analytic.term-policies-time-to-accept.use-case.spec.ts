import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticInvalidDateRangeException } from '@modules/analytic/exceptions/analytic.invalid-date-range.exception';
import { AnalyticTermPolicyService } from '@modules/analytic/services/analytic.term-policy.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticTermPoliciesTimeToAcceptUseCase } from '@modules/analytic/use-cases/analytic.term-policies-time-to-accept.use-case';

describe('AnalyticTermPoliciesTimeToAcceptUseCase', () => {
    const analyticTermPolicyService: MockProxy<AnalyticTermPolicyService> =
        mock<AnalyticTermPolicyService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticTermPoliciesTimeToAcceptUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticTermPoliciesTimeToAcceptUseCase,
                {
                    provide: AnalyticTermPolicyService,
                    useValue: analyticTermPolicyService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticTermPoliciesTimeToAcceptUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticTermPolicyService.termPoliciesTimeToAccept.mockResolvedValue(
                { count: 3, averageMs: 1500 }
            );

            const result = await useCase.execute({ startDate, endDate });

            expect(analyticDateService.requireRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );
            expect(result).toEqual({ data: { count: 3, averageMs: 1500 } });
            expect(
                analyticTermPolicyService.termPoliciesTimeToAccept
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('throws and reads nothing when the range check rejects the range', async () => {
            analyticDateService.requireRange.mockImplementation(() => {
                throw new AnalyticInvalidDateRangeException();
            });

            const promise = useCase.execute({ startDate, endDate });

            await expect(promise).rejects.toBeInstanceOf(
                AnalyticInvalidDateRangeException
            );
            expect(
                analyticTermPolicyService.termPoliciesTimeToAccept
            ).not.toHaveBeenCalled();
        });
    });
});
