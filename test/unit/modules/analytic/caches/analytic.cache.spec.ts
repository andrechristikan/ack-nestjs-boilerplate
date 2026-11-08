import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumAnalyticAnomalySignal,
    EnumAnalyticFraudSignal,
} from '@modules/analytic/enums/analytic.enum';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';

describe('AnalyticCache', () => {
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();

    let cache: AnalyticCache;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | number> = {
                'analytic.cache.keyPatterns.dashboard':
                    'Dashboard:{metric}:{start}:{end}',
                'analytic.cache.keyPatterns.anomalySummary':
                    'Anomaly:{signal}:{window}',
                'analytic.cache.keyPatterns.fraudSummary':
                    'Fraud:{signal}:{window}',
                'analytic.cache.keyPatterns.riskScore': 'RiskScore:{userId}',
                'analytic.cache.dashboardTtlInMs': 1000,
                'analytic.cache.anomalySummaryTtlInMs': 2000,
                'analytic.cache.fraudSummaryTtlInMs': 3000,
                'analytic.cache.riskScoreTtlInMs': 4000,
            };
            return values[key];
        });
        helperStringService.fillPattern.mockImplementation((_pattern, tokens) =>
            Object.values(tokens).join(':')
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticCache,
                { provide: ConfigService, useValue: configService },
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();

        cache = module.get(AnalyticCache);
    });

    describe('dashboardTtlInMs', () => {
        it('reads dashboardTtlInMs from analytic.cache.dashboardTtlInMs', () => {
            expect(cache.dashboardTtlInMs).toBe(1000);
            expect(configGet).toHaveBeenCalledWith(
                'analytic.cache.dashboardTtlInMs'
            );
        });
    });

    describe('anomalySummaryTtlInMs', () => {
        it('reads anomalySummaryTtlInMs from analytic.cache.anomalySummaryTtlInMs', () => {
            expect(cache.anomalySummaryTtlInMs).toBe(2000);
            expect(configGet).toHaveBeenCalledWith(
                'analytic.cache.anomalySummaryTtlInMs'
            );
        });
    });

    describe('fraudSummaryTtlInMs', () => {
        it('reads fraudSummaryTtlInMs from analytic.cache.fraudSummaryTtlInMs', () => {
            expect(cache.fraudSummaryTtlInMs).toBe(3000);
            expect(configGet).toHaveBeenCalledWith(
                'analytic.cache.fraudSummaryTtlInMs'
            );
        });
    });

    describe('riskScoreTtlInMs', () => {
        it('reads riskScoreTtlInMs from analytic.cache.riskScoreTtlInMs', () => {
            expect(cache.riskScoreTtlInMs).toBe(4000);
            expect(configGet).toHaveBeenCalledWith(
                'analytic.cache.riskScoreTtlInMs'
            );
        });
    });

    describe('buildDashboardKey', () => {
        it('builds the dashboard key from the pattern', () => {
            const result = cache.buildDashboardKey(
                'users.registrations',
                'start',
                'end'
            );

            expect(result).toBe('users.registrations:start:end');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Dashboard:{metric}:{start}:{end}',
                {
                    metric: 'users.registrations',
                    start: 'start',
                    end: 'end',
                }
            );
        });
    });

    describe('buildAnomalySummaryKey', () => {
        it('builds the anomaly summary key from the pattern', () => {
            const result = cache.buildAnomalySummaryKey(
                EnumAnalyticAnomalySignal.impossibleTravel,
                '3600000'
            );

            expect(result).toBe('impossible-travel:3600000');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Anomaly:{signal}:{window}',
                {
                    signal: EnumAnalyticAnomalySignal.impossibleTravel,
                    window: '3600000',
                }
            );
        });
    });

    describe('buildFraudSummaryKey', () => {
        it('builds the fraud summary key from the pattern', () => {
            const result = cache.buildFraudSummaryKey(
                EnumAnalyticFraudSignal.credentialStuffing,
                '86400000'
            );

            expect(result).toBe('credential-stuffing:86400000');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Fraud:{signal}:{window}',
                {
                    signal: EnumAnalyticFraudSignal.credentialStuffing,
                    window: '86400000',
                }
            );
        });
    });

    describe('buildRiskScoreKey', () => {
        it('builds the risk score key from the pattern', () => {
            const result = cache.buildRiskScoreKey('user-$&');

            expect(result).toBe('RiskScore:user-$&');
            expect(helperStringService.fillPattern).not.toHaveBeenCalled();
        });
    });
});
