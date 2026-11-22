import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticInvalidDateRangeException } from '@modules/analytic/exceptions/analytic.invalid-date-range.exception';
import { EnumAnalyticStatusCodeError } from '@modules/analytic/enums/analytic.status-code.enum';
import { AnalyticAuthService } from '@modules/analytic/services/analytic.auth.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticAuthSessionsUserAgentUseCase } from '@modules/analytic/use-cases/analytic.auth-sessions-user-agent.use-case';

describe('AnalyticAuthSessionsUserAgentUseCase', () => {
    const analyticAuthService: MockProxy<AnalyticAuthService> =
        mock<AnalyticAuthService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticAuthSessionsUserAgentUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticAuthSessionsUserAgentUseCase,
                {
                    provide: AnalyticAuthService,
                    useValue: analyticAuthService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticAuthSessionsUserAgentUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticAuthService.getAuthSessionsUserAgent.mockResolvedValue({
                buckets: [{ key: 'Chrome', count: 7 }],
            });

            const result = await useCase.execute({ startDate, endDate });

            expect(analyticDateService.requireRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );
            expect(result).toEqual({
                data: { buckets: [{ key: 'Chrome', count: 7 }] },
            });
            expect(
                analyticAuthService.getAuthSessionsUserAgent
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('throws and reads nothing when the range check rejects the range', async () => {
            analyticDateService.requireRange.mockImplementation(() => {
                throw new AnalyticInvalidDateRangeException();
            });

            const promise = useCase.execute({ startDate, endDate });

            await expect(promise).rejects.toMatchObject({
                module: 'analytic',
                statusCode: EnumAnalyticStatusCodeError.invalidDateRange,
            });
            expect(
                analyticAuthService.getAuthSessionsUserAgent
            ).not.toHaveBeenCalled();
        });
    });
});
