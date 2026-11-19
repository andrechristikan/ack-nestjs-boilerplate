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
                'analytic.cache.dashboardKeyPattern':
                    'Dashboard:{metric}:{start}:{end}',
                'analytic.cache.dashboardPageKeyPattern':
                    'Dashboard:{metric}:{start}:{end}:{page}:{perPage}',
                'analytic.cache.workspaceSummaryKeyPattern':
                    'Workspace:{workspaceId}:Summary:{start}:{end}',
                'analytic.cache.anomalySummaryKeyPattern':
                    'Anomaly:{signal}:{window}',
                'analytic.cache.fraudSummaryKeyPattern':
                    'Fraud:{signal}:{window}',
                'analytic.cache.dashboardTtlInMs': 1000,
                'analytic.cache.anomalySummaryTtlInMs': 2000,
                'analytic.cache.fraudSummaryTtlInMs': 3000,
                'analytic.cache.liveSummaryTtlInMs': 4000,
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

    describe('liveSummaryTtlInMs', () => {
        it('reads liveSummaryTtlInMs from analytic.cache.liveSummaryTtlInMs', () => {
            expect(cache.liveSummaryTtlInMs).toBe(4000);
            expect(configService.get).toHaveBeenCalledWith(
                'analytic.cache.liveSummaryTtlInMs'
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

    describe('buildDashboardPageKey', () => {
        it('builds the paged dashboard key from its own pattern', () => {
            const result = cache.buildDashboardPageKey(
                'workspaces.membership',
                'start',
                'end',
                2,
                20
            );

            expect(result).toBe('workspaces.membership:start:end:2:20');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Dashboard:{metric}:{start}:{end}:{page}:{perPage}',
                {
                    metric: 'workspaces.membership',
                    start: 'start',
                    end: 'end',
                    page: '2',
                    perPage: '20',
                }
            );
        });
    });

    describe('buildWorkspaceSummaryKey', () => {
        it('builds the workspace summary key from its own pattern', () => {
            const result = cache.buildWorkspaceSummaryKey(
                'ws-1',
                'start',
                'end'
            );

            expect(result).toBe('ws-1:start:end');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Workspace:{workspaceId}:Summary:{start}:{end}',
                { workspaceId: 'ws-1', start: 'start', end: 'end' }
            );
        });
    });

    describe('buildAnomalySummaryKey', () => {
        it('builds the anomaly summary key from the pattern', () => {
            const result = cache.buildAnomalySummaryKey(
                EnumAnalyticAnomalySignal.failedLoginSpike,
                '3600000'
            );

            expect(result).toBe('failed-login-spike:3600000');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Anomaly:{signal}:{window}',
                {
                    signal: EnumAnalyticAnomalySignal.failedLoginSpike,
                    window: '3600000',
                }
            );
        });
    });

    describe('buildFraudSummaryKey', () => {
        it('builds the fraud summary key from the pattern', () => {
            const result = cache.buildFraudSummaryKey(
                EnumAnalyticFraudSignal.massRegistration,
                '86400000'
            );

            expect(result).toBe('mass-registration:86400000');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'Fraud:{signal}:{window}',
                {
                    signal: EnumAnalyticFraudSignal.massRegistration,
                    window: '86400000',
                }
            );
        });
    });
});
