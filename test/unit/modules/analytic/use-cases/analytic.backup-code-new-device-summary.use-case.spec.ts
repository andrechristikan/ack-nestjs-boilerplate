import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticBackupCodeNewDeviceSummaryUseCase } from '@modules/analytic/use-cases/analytic.backup-code-new-device-summary.use-case';

describe('AnalyticBackupCodeNewDeviceSummaryUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

    const computedAt = new Date('2026-01-01T00:15:00.000Z');

    let useCase: AnalyticBackupCodeNewDeviceSummaryUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticBackupCodeNewDeviceSummaryUseCase,
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticBackupCodeNewDeviceSummaryUseCase);
    });

    describe('execute', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticFraudService.backupCodeNewDeviceSummary.mockResolvedValue({
                count: 6,
                windowStart: null,
                windowEnd: null,
                computedAt,
            });

            const result = await useCase.execute();

            expect(result).toEqual({
                data: {
                    count: 6,
                    windowStart: null,
                    windowEnd: null,
                    computedAt,
                },
            });
            expect(
                analyticFraudService.backupCodeNewDeviceSummary
            ).toHaveBeenCalledWith();
        });
    });
});
