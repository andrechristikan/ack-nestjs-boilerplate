import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { CacheService } from '@common/cache/services/cache.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import {
    EnumActivityLogAction,
    EnumAnalyticSnapshotSignal,
} from '@generated/prisma-client/client';
import { ActivityLogWorkspaceVolumeContract } from '@modules/activity-log/contracts/activity-log.workspace-volume.contract';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import { AnalyticWorkspaceRepository } from '@modules/analytic/repositories/analytic.workspace.repository';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import { AnalyticWorkspaceService } from '@modules/analytic/services/analytic.workspace.service';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticMetricCountCacheSchema } from '@modules/analytic/dtos/analytic.metric-count-cache.dto';
import { AnalyticRoleCountsCacheSchema } from '@modules/analytic/dtos/analytic.role-counts-cache.dto';
import { AnalyticStatusCountsCacheSchema } from '@modules/analytic/dtos/analytic.status-counts-cache.dto';
import { AnalyticWorkspaceCountPageCacheSchema } from '@modules/analytic/dtos/analytic.workspace-count-page-cache.dto';
import { AnalyticWorkspaceMembershipSnapshotDataSchema } from '@modules/analytic/dtos/analytic.workspace-membership-snapshot-data.dto';
import { AnalyticWorkspaceSummaryCacheSchema } from '@modules/analytic/dtos/analytic.workspace-summary-cache.dto';

describe('AnalyticWorkspaceService', () => {
    const dashboardTtlInMs = 1800000;
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>({
        dashboardTtlInMs,
    });
    const cacheService: MockProxy<CacheService> = mock<CacheService>();
    const analyticWorkspaceRepository: MockProxy<AnalyticWorkspaceRepository> =
        mock<AnalyticWorkspaceRepository>();
    const analyticSnapshotService: MockProxy<AnalyticSnapshotService> =
        mock<AnalyticSnapshotService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
    const startToken = '2026-01-01T00:00:00.000Z';
    const endToken = '2026-02-01T00:00:00.000Z';
    const pagination = { skip: 0, limit: 20, orderBy: [] };
    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 1,
        perPage: 20,
        page: 1,
        totalPage: 1,
        hasNext: false,
        hasPrevious: false,
        data: [{ workspaceId: 'workspace-1', count: 3 }],
    };
    const cachedValue = { count: 99 };

    let service: AnalyticWorkspaceService;

    beforeEach(async () => {
        analyticCache.buildDashboardKey.mockImplementation(
            (metric, start, end) =>
                `${metric}:${start?.toISOString() ?? '_'}:${end?.toISOString() ?? '_'}`
        );
        analyticCache.buildDashboardPageKey.mockImplementation(
            (metric, start, end, page, perPage) =>
                `${metric}:${start?.toISOString() ?? '_'}:${end?.toISOString() ?? '_'}:${page}:${perPage}`
        );
        analyticCache.buildWorkspaceSummaryKey.mockImplementation(
            (workspaceId, start, end) =>
                `Summary:${workspaceId}:${start?.toISOString() ?? '_'}:${end?.toISOString() ?? '_'}`
        );
        analyticCache.buildWorkspaceInviteFunnelKey.mockImplementation(
            (workspaceId, start, end) =>
                `InviteFunnel:${workspaceId}:${start.toISOString()}:${end.toISOString()}`
        );
        analyticCache.buildWorkspaceJoinOutcomesKey.mockImplementation(
            (workspaceId, start, end) =>
                `JoinOutcomes:${workspaceId}:${start.toISOString()}:${end.toISOString()}`
        );
        analyticCache.buildWorkspaceMemberRolesKey.mockImplementation(
            workspaceId => `MemberRoles:${workspaceId}`
        );
        cacheService.readThrough.mockImplementation(
            async (_key, _schema, _ttlInMs, loader) => loader()
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticWorkspaceService,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: CacheService, useValue: cacheService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                    }),
                },
                {
                    provide: AnalyticSnapshotService,
                    useValue: analyticSnapshotService,
                },
                {
                    provide: AnalyticWorkspaceRepository,
                    useValue: analyticWorkspaceRepository,
                },
            ],
        }).compile();

        service = module.get(AnalyticWorkspaceService);
    });

    describe('getWorkspaceCreation', () => {
        it('wraps the repository count', async () => {
            analyticWorkspaceRepository.countCreated.mockResolvedValue(4);

            const result = await service.getWorkspaceCreation(
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 4 });
            expect(
                analyticWorkspaceRepository.countCreated
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('reads through with the dashboard key, AnalyticMetricCountCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.getWorkspaceCreation(
                startDate,
                endDate
            );

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.workspaceCreation}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('getWorkspaceInviteFunnel', () => {
        it('asks the repository with a null workspace id', async () => {
            const rows = [{ status: 'pending', count: 2 }];
            analyticWorkspaceRepository.groupInviteFunnel.mockResolvedValue(
                rows
            );

            const result = await service.getWorkspaceInviteFunnel(
                startDate,
                endDate
            );

            expect(result).toEqual(rows);
            expect(
                analyticWorkspaceRepository.groupInviteFunnel
            ).toHaveBeenCalledWith(startDate, endDate, null);
        });

        it('reads through with the dashboard key, AnalyticStatusCountsCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            await service.getWorkspaceInviteFunnel(startDate, endDate);

            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.workspaceInviteFunnel}:${startToken}:${endToken}`,
                AnalyticStatusCountsCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('getWorkspaceJoinOutcomes', () => {
        it('asks the repository with a null workspace id', async () => {
            const rows = [{ status: 'approved', count: 1 }];
            analyticWorkspaceRepository.groupJoinOutcomes.mockResolvedValue(
                rows
            );

            const result = await service.getWorkspaceJoinOutcomes(
                startDate,
                endDate
            );

            expect(result).toEqual(rows);
            expect(
                analyticWorkspaceRepository.groupJoinOutcomes
            ).toHaveBeenCalledWith(startDate, endDate, null);
        });

        it('reads through with the dashboard key, AnalyticStatusCountsCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            await service.getWorkspaceJoinOutcomes(startDate, endDate);

            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.workspaceJoinOutcomes}:${startToken}:${endToken}`,
                AnalyticStatusCountsCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('computeWorkspaceMembership', () => {
        it('returns the repository items with null metadata and a null window', async () => {
            const items = [
                {
                    key: 'workspace-1',
                    value: 3,
                    occurredAt: null,
                    data: { workspaceId: 'workspace-1', count: 3 },
                },
            ];
            analyticWorkspaceRepository.findMembership.mockResolvedValue(items);

            const result = await service.computeWorkspaceMembership();

            expect(result).toEqual({
                items,
                metadata: null,
                windowStart: null,
                windowEnd: null,
            });
            expect(
                analyticWorkspaceRepository.findMembership
            ).toHaveBeenCalledTimes(1);
        });
    });

    describe('getWorkspaceMembershipList', () => {
        it('returns the stored page for the signal with a null value filter and touches neither the repository nor the cache', async () => {
            analyticSnapshotService.getListOffset.mockResolvedValue(offsetPage);

            const result = await service.getWorkspaceMembershipList(pagination);

            expect(result).toBe(offsetPage);
            expect(analyticSnapshotService.getListOffset).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.workspaceMembership,
                pagination,
                null,
                AnalyticWorkspaceMembershipSnapshotDataSchema
            );
            expect(
                analyticWorkspaceRepository.findMembership
            ).not.toHaveBeenCalled();
            expect(cacheService.readThrough).not.toHaveBeenCalled();
        });
    });

    describe('getWorkspaceActivityVolumeList', () => {
        it('passes the range, the contract actions, and the params to one repository method and returns its page unchanged', async () => {
            analyticWorkspaceRepository.groupActivityVolume.mockResolvedValue(
                offsetPage
            );

            const result = await service.getWorkspaceActivityVolumeList(
                startDate,
                endDate,
                pagination
            );

            expect(result).toBe(offsetPage);
            expect(
                analyticWorkspaceRepository.groupActivityVolume
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticWorkspaceRepository.groupActivityVolume
            ).toHaveBeenCalledWith(
                startDate,
                endDate,
                [...ActivityLogWorkspaceVolumeContract],
                pagination
            );
            expect(
                analyticWorkspaceRepository.groupActivityVolume
            ).toHaveBeenCalledWith(
                startDate,
                endDate,
                expect.arrayContaining([
                    EnumActivityLogAction.workspaceOwnershipRemovedByAdmin,
                ]),
                pagination
            );
        });

        it('reads through with the page key, AnalyticWorkspaceCountPageCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            await service.getWorkspaceActivityVolumeList(
                startDate,
                endDate,
                pagination
            );

            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.workspaceActivityVolume}:${startToken}:${endToken}:1:20`,
                AnalyticWorkspaceCountPageCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('getSummary', () => {
        it('reads through with the workspace summary key, AnalyticWorkspaceSummaryCacheSchema, and the dashboard TTL', async () => {
            const cached = {
                memberCount: 9,
                projectCount: 4,
                activityCount: 12,
            };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.getSummary(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toBe(cached);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `Summary:workspace-1:${startToken}:${endToken}`,
                AnalyticWorkspaceSummaryCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });

        it('computes the three counts in one repository call with the open window when dates are omitted', async () => {
            const counts = {
                memberCount: 3,
                projectCount: 2,
                activityCount: 21,
            };
            analyticWorkspaceRepository.findSummary.mockResolvedValue(counts);

            const result = await service.getSummary('workspace-1', null, null);

            expect(result).toEqual(counts);
            expect(
                analyticWorkspaceRepository.findSummary
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticWorkspaceRepository.findSummary
            ).toHaveBeenCalledWith('workspace-1', null, null, [
                ...ActivityLogWorkspaceVolumeContract,
            ]);
            expect(
                analyticWorkspaceRepository.findSummary
            ).toHaveBeenCalledWith(
                'workspace-1',
                null,
                null,
                expect.arrayContaining([
                    EnumActivityLogAction.workspaceOwnershipRemovedByAdmin,
                ])
            );
        });
    });

    describe('getInviteFunnel', () => {
        it('reads through with the workspace invite funnel key, AnalyticStatusCountsCacheSchema, and dashboardTtlInMs', async () => {
            const cached = [{ status: 'pending', count: 2 }];
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.getInviteFunnel(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toBe(cached);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `InviteFunnel:workspace-1:${startToken}:${endToken}`,
                AnalyticStatusCountsCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });

        it('loads from the repository with the workspace id', async () => {
            const rows = [{ status: 'pending', count: 2 }];
            analyticWorkspaceRepository.groupInviteFunnel.mockResolvedValue(
                rows
            );

            const result = await service.getInviteFunnel(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toEqual(rows);
            expect(
                analyticWorkspaceRepository.groupInviteFunnel
            ).toHaveBeenCalledWith(startDate, endDate, 'workspace-1');
        });
    });

    describe('getJoinOutcomes', () => {
        it('reads through with the workspace join outcomes key, AnalyticStatusCountsCacheSchema, and dashboardTtlInMs', async () => {
            const cached = [{ status: 'approved', count: 1 }];
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.getJoinOutcomes(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toBe(cached);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `JoinOutcomes:workspace-1:${startToken}:${endToken}`,
                AnalyticStatusCountsCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });

        it('loads from the repository with the workspace id', async () => {
            const rows = [{ status: 'approved', count: 1 }];
            analyticWorkspaceRepository.groupJoinOutcomes.mockResolvedValue(
                rows
            );

            const result = await service.getJoinOutcomes(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toEqual(rows);
            expect(
                analyticWorkspaceRepository.groupJoinOutcomes
            ).toHaveBeenCalledWith(startDate, endDate, 'workspace-1');
        });
    });

    describe('getMemberRoles', () => {
        it('reads through with the workspace member roles key, AnalyticRoleCountsCacheSchema, and dashboardTtlInMs', async () => {
            const cached = [{ role: 'admin', count: 2 }];
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.getMemberRoles('workspace-1');

            expect(result).toBe(cached);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                'MemberRoles:workspace-1',
                AnalyticRoleCountsCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });

        it('loads the repository role counts', async () => {
            const rows = [{ role: 'admin', count: 2 }];
            analyticWorkspaceRepository.groupMemberRoles.mockResolvedValue(
                rows
            );

            const result = await service.getMemberRoles('workspace-1');

            expect(result).toEqual(rows);
            expect(
                analyticWorkspaceRepository.groupMemberRoles
            ).toHaveBeenCalledWith('workspace-1');
        });
    });
});
