import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticAccountTakeoverSummaryUseCase } from '@modules/analytic/use-cases/analytic.account-takeover-summary.use-case';

describe('AnalyticAccountTakeoverSummaryUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticAccountTakeoverSummaryUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticAccountTakeoverSummaryUseCase,
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticAccountTakeoverSummaryUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticFraudService.accountTakeoverSummary.mockResolvedValue({
                count: 6,
                window: '24h',
            });

            const result = await useCase.execute({
                startDate,
                endDate,
            });

            expect(result).toEqual({
                data: {
                    count: 6,
                    window: '24h',
                },
            });
            expect(
                analyticFraudService.accountTakeoverSummary
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('passes the query dates to the range check', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticFraudService.accountTakeoverSummary.mockResolvedValue({
                count: 0,
                window: null,
            });

            await useCase.execute({ startDate, endDate });

            expect(analyticDateService.requireRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
    });
});
