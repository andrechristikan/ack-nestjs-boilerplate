import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticCredentialStuffingSummaryUseCase } from '@modules/analytic/use-cases/analytic.credential-stuffing-summary.use-case';

describe('AnalyticCredentialStuffingSummaryUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

    const windowMs: number = 3600000;

    let useCase: AnalyticCredentialStuffingSummaryUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

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
            analyticFraudService.credentialStuffingSummary.mockResolvedValue({
                count: 6,
                window: '24h',
                meta: { minUniqueAccounts: 5 },
            });

            const result = await useCase.execute({
                windowMs,
            });

            expect(result).toEqual({
                data: {
                    count: 6,
                    window: '24h',
                    meta: { minUniqueAccounts: 5 },
                },
            });
            expect(
                analyticFraudService.credentialStuffingSummary
            ).toHaveBeenCalledWith(windowMs);
        });

        it('passes null when windowMs is omitted', async () => {
            analyticFraudService.credentialStuffingSummary.mockResolvedValue({
                count: 0,
                window: null,
                meta: { minUniqueAccounts: 5 },
            });

            await useCase.execute({});

            expect(
                analyticFraudService.credentialStuffingSummary
            ).toHaveBeenCalledWith(null);
        });
    });
});
