import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticBackupCodeNewDeviceSummaryUseCase } from '@modules/analytic/use-cases/analytic.backup-code-new-device-summary.use-case';

describe('AnalyticBackupCodeNewDeviceSummaryUseCase', () => {
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();

    const windowMs: number = 3600000;

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
                window: '24h',
            });

            const result = await useCase.execute({
                windowMs,
            });

            expect(result).toEqual({
                data: {
                    count: 6,
                    window: '24h',
                },
            });
            expect(
                analyticFraudService.backupCodeNewDeviceSummary
            ).toHaveBeenCalledWith(windowMs);
        });

        it('passes null when windowMs is omitted', async () => {
            analyticFraudService.backupCodeNewDeviceSummary.mockResolvedValue({
                count: 0,
                window: null,
            });

            await useCase.execute({});

            expect(
                analyticFraudService.backupCodeNewDeviceSummary
            ).toHaveBeenCalledWith(null);
        });
    });
});
