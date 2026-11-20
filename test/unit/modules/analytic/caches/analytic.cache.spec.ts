import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumAnalyticAnomalySignal,
    EnumAnalyticFraudSignal,
} from '@modules/analytic/enums/analytic.enum';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('AnalyticCache', () => {
    let configService: MockProxy<ConfigService>;

    let cache: AnalyticCache;

    beforeEach(async () => {
        configService = buildConfigService({
            'analytic.cache.dashboardKeyPattern':
                'Dashboard:{metric}:{start}:{end}',
            'analytic.cache.dashboardPageKeyPattern':
                'Dashboard:{metric}:{start}:{end}:{page}:{perPage}',
            'analytic.cache.workspaceSummaryKeyPattern':
                'Workspace:{workspaceId}:Summary:{start}:{end}',
            'analytic.cache.anomalySummaryKeyPattern':
                'Anomaly:{signal}:{window}',
            'analytic.cache.fraudSummaryKeyPattern': 'Fraud:{signal}:{window}',
            'analytic.cache.dashboardTtlInMs': 1000,
            'analytic.cache.anomalySummaryTtlInMs': 2000,
            'analytic.cache.liveSummaryTtlInMs': 4000,
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticCache,
                { provide: ConfigService, useValue: configService },
                HelperStringService,
            ],
        }).compile();

        cache = module.get(AnalyticCache);
    });

    describe('dashboardTtlInMs', () => {
        it('reads dashboardTtlInMs from analytic.cache.dashboardTtlInMs', () => {
            expect(cache.dashboardTtlInMs).toBe(1000);
            expect(configService.get).toHaveBeenCalledWith(
                'analytic.cache.dashboardTtlInMs'
            );
        });
    });

    describe('anomalySummaryTtlInMs', () => {
        it('reads anomalySummaryTtlInMs from analytic.cache.anomalySummaryTtlInMs', () => {
            expect(cache.anomalySummaryTtlInMs).toBe(2000);
            expect(configService.get).toHaveBeenCalledWith(
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

    describe('buildDashboardKey', () => {
        it('builds the dashboard key from the pattern', () => {
            const result = cache.buildDashboardKey(
                'users.registrations',
                'start',
                'end'
            );

            expect(result).toBe('Dashboard:users.registrations:start:end');
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

            expect(result).toBe(
                'Dashboard:workspaces.membership:start:end:2:20'
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

            expect(result).toBe('Workspace:ws-1:Summary:start:end');
        });
    });

    describe('buildAnomalySummaryKey', () => {
        it('builds the anomaly summary key from the pattern', () => {
            const result = cache.buildAnomalySummaryKey(
                EnumAnalyticAnomalySignal.failedLoginSpike,
                '3600000'
            );

            expect(result).toBe('Anomaly:failed-login-spike:3600000');
        });
    });

    describe('buildFraudSummaryKey', () => {
        it('builds the fraud summary key from the pattern', () => {
            const result = cache.buildFraudSummaryKey(
                EnumAnalyticFraudSignal.massRegistration,
                '86400000'
            );

            expect(result).toBe('Fraud:mass-registration:86400000');
        });
    });
});
