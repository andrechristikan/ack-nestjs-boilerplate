import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticCredentialStuffingSummaryUseCase } from '@modules/analytic/use-cases/analytic.credential-stuffing-summary.use-case';

describe('AnalyticCredentialStuffingSummaryUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

    const computedAt = new Date('2026-01-01T00:15:00.000Z');

    let useCase: AnalyticCredentialStuffingSummaryUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticCredentialStuffingSummaryUseCase,
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticCredentialStuffingSummaryUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticFraudService.getCredentialStuffingSummary.mockResolvedValue(
                {
                    count: 6,
                    windowStart: null,
                    windowEnd: null,
                    computedAt,
                    metadata: { minUniqueAccounts: 2 },
                }
            );

            const result = await useCase.execute();

            expect(result).toEqual({
                data: {
                    count: 6,
                    windowStart: null,
                    windowEnd: null,
                    computedAt,
                    metadata: { minUniqueAccounts: 2 },
                },
            });
            expect(
                analyticFraudService.getCredentialStuffingSummary
            ).toHaveBeenCalledWith();
        });
    });
});
