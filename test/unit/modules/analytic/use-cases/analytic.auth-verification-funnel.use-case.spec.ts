import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticAuthService } from '@modules/analytic/services/analytic.auth.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticAuthVerificationFunnelUseCase } from '@modules/analytic/use-cases/analytic.auth-verification-funnel.use-case';

describe('AnalyticAuthVerificationFunnelUseCase', () => {
    const analyticAuthService: MockProxy<AnalyticAuthService> =
        mock<AnalyticAuthService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticAuthVerificationFunnelUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticAuthVerificationFunnelUseCase,
                {
                    provide: AnalyticAuthService,
                    useValue: analyticAuthService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticAuthVerificationFunnelUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticAuthService.getAuthVerificationFunnel.mockResolvedValue({
                email: { used: 1, unused: 2, total: 3, rate: 0.33 },
                mobile: { used: 4, unused: 1, total: 5, rate: 0.8 },
            });

            const result = await useCase.execute({
                startDate,
                endDate,
            });

            expect(result).toEqual({
                data: {
                    email: { used: 1, unused: 2, total: 3, rate: 0.33 },
                    mobile: { used: 4, unused: 1, total: 5, rate: 0.8 },
                },
            });
            expect(
                analyticAuthService.getAuthVerificationFunnel
            ).toHaveBeenCalledWith(startDate, endDate);
        });
        it('passes the query dates to the range check', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticAuthService.getAuthVerificationFunnel.mockResolvedValue({
                email: { used: 1, unused: 2, total: 3, rate: 0.33 },
                mobile: { used: 4, unused: 1, total: 5, rate: 0.8 },
            });

            await useCase.execute({ startDate, endDate });

            expect(analyticDateService.requireRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
    });
});
