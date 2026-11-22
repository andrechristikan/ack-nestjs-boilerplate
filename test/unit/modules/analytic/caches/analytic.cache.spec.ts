import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumAnalyticAnomalySignal,
    EnumAnalyticFraudSignal,
} from '@modules/analytic/enums/analytic.enum';
import { AnalyticCacheEmptyToken } from '@modules/analytic/constants/analytic.constant';
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
            'analytic.cache.workspaceInviteFunnelKeyPattern':
                'Workspace:{workspaceId}:InviteFunnel:{start}:{end}',
            'analytic.cache.workspaceJoinOutcomesKeyPattern':
                'Workspace:{workspaceId}:JoinOutcomes:{start}:{end}',
            'analytic.cache.workspaceMemberRolesKeyPattern':
                'Workspace:{workspaceId}:MemberRoles',
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
        it('builds the dashboard key with the ISO string of a date and the empty token for null', () => {
            const result = cache.buildDashboardKey(
                'users.registrations',
                new Date('2025-01-01T00:00:00.000Z'),
                null
            );

            expect(result).toBe(
                `Dashboard:users.registrations:2025-01-01T00:00:00.000Z:${AnalyticCacheEmptyToken}`
            );
        });
    });

    describe('buildDashboardPageKey', () => {
        it('builds the paged dashboard key from its own pattern', () => {
            const result = cache.buildDashboardPageKey(
                'workspaces.membership',
                new Date('2025-01-01T00:00:00.000Z'),
                null,
                2,
                20
            );

            expect(result).toBe(
                `Dashboard:workspaces.membership:2025-01-01T00:00:00.000Z:${AnalyticCacheEmptyToken}:2:20`
            );
        });
    });

    describe('buildWorkspaceSummaryKey', () => {
        it('builds the workspace summary key from its own pattern', () => {
            const result = cache.buildWorkspaceSummaryKey(
                'ws-1',
                null,
                new Date('2025-02-01T00:00:00.000Z')
            );

            expect(result).toBe(
                `Workspace:ws-1:Summary:${AnalyticCacheEmptyToken}:2025-02-01T00:00:00.000Z`
            );
        });
    });

    describe('buildWorkspaceInviteFunnelKey', () => {
        it('fills the pattern and separates two workspaces', () => {
            const start = new Date('2025-01-01T00:00:00.000Z');
            const end = new Date('2025-02-01T00:00:00.000Z');

            expect(
                cache.buildWorkspaceInviteFunnelKey('ws-1', start, end)
            ).toBe(
                'Workspace:ws-1:InviteFunnel:2025-01-01T00:00:00.000Z:2025-02-01T00:00:00.000Z'
            );
            expect(
                cache.buildWorkspaceInviteFunnelKey('ws-2', start, end)
            ).not.toBe(cache.buildWorkspaceInviteFunnelKey('ws-1', start, end));
        });
    });

    describe('buildWorkspaceJoinOutcomesKey', () => {
        it('fills the pattern and separates two workspaces', () => {
            const start = new Date('2025-01-01T00:00:00.000Z');
            const end = new Date('2025-02-01T00:00:00.000Z');

            expect(
                cache.buildWorkspaceJoinOutcomesKey('ws-1', start, end)
            ).toBe(
                'Workspace:ws-1:JoinOutcomes:2025-01-01T00:00:00.000Z:2025-02-01T00:00:00.000Z'
            );
            expect(
                cache.buildWorkspaceJoinOutcomesKey('ws-2', start, end)
            ).not.toBe(cache.buildWorkspaceJoinOutcomesKey('ws-1', start, end));
        });
    });

    describe('buildWorkspaceMemberRolesKey', () => {
        it('fills the pattern with the workspace id and no date', () => {
            expect(cache.buildWorkspaceMemberRolesKey('ws-1')).toBe(
                'Workspace:ws-1:MemberRoles'
            );
            expect(cache.buildWorkspaceMemberRolesKey('ws-2')).toBe(
                'Workspace:ws-2:MemberRoles'
            );
        });
    });

    describe('buildAnomalySummaryKey', () => {
        it('builds the anomaly summary key from the pattern', () => {
            const result = cache.buildAnomalySummaryKey(
                EnumAnalyticAnomalySignal.failedLoginSpike,
                '3600000'
            );

            expect(result).toBe('Anomaly:failedLoginSpike:3600000');
        });
    });

    describe('buildFraudSummaryKey', () => {
        it('builds the fraud summary key from the pattern', () => {
            const result = cache.buildFraudSummaryKey(
                EnumAnalyticFraudSignal.massRegistration,
                '86400000'
            );

            expect(result).toBe('Fraud:massRegistration:86400000');
        });
    });
});
