import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { CacheService } from '@common/cache/services/cache.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';
import { ActivityLogWorkspaceVolumeContract } from '@modules/activity-log/contracts/activity-log.workspace-volume.contract';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import {
    AnalyticMetricCountCacheSchema,
    AnalyticStatusCountsCacheSchema,
    AnalyticWorkspaceCountPageCacheSchema,
    AnalyticWorkspaceMembershipSnapshotDataSchema,
    AnalyticWorkspaceSummaryCacheSchema,
} from '@modules/analytic/constants/analytic.constant';
import { EnumAnalyticDashboardMetric } from '@modules/analytic/enums/analytic.enum';
import { AnalyticWorkspaceRepository } from '@modules/analytic/repositories/analytic.workspace.repository';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import { AnalyticWorkspaceService } from '@modules/analytic/services/analytic.workspace.service';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

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
            (metric, start, end) => `${metric}:${start}:${end}`
        );
        analyticCache.buildDashboardPageKey.mockImplementation(
            (metric, start, end, page, perPage) =>
                `${metric}:${start}:${end}:${page}:${perPage}`
        );
        analyticCache.buildWorkspaceSummaryKey.mockImplementation(
            (workspaceId, start, end) =>
                `Summary:${workspaceId}:${start}:${end}`
        );
        cacheService.readThrough.mockImplementation(
            async (_key, _schema, _ttlInMs, loader) => loader()
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticWorkspaceService,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: CacheService, useValue: cacheService },
                AnalyticDateUtil,
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'analytic.cache.windowTokenPattern':
                            'Window:{start}:{end}',
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

    describe('workspacesCreation', () => {
        it('wraps the repository count', async () => {
            analyticWorkspaceRepository.countCreated.mockResolvedValue(4);

            const result = await service.workspacesCreation(startDate, endDate);

            expect(result).toEqual({ count: 4 });
            expect(
                analyticWorkspaceRepository.countCreated
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('reads through with the dashboard key, AnalyticMetricCountCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            const result = await service.workspacesCreation(startDate, endDate);

            expect(result).toBe(cachedValue);
            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.workspacesCreation}:${startToken}:${endToken}`,
                AnalyticMetricCountCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('workspacesInviteFunnel', () => {
        it('asks the repository with a null workspace id', async () => {
            const rows = [{ status: 'pending', count: 2 }];
            analyticWorkspaceRepository.groupInviteFunnel.mockResolvedValue(
                rows
            );

            const result = await service.workspacesInviteFunnel(
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

            await service.workspacesInviteFunnel(startDate, endDate);

            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.workspacesInviteFunnel}:${startToken}:${endToken}`,
                AnalyticStatusCountsCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('workspacesJoinOutcomes', () => {
        it('asks the repository with a null workspace id', async () => {
            const rows = [{ status: 'approved', count: 1 }];
            analyticWorkspaceRepository.groupJoinOutcomes.mockResolvedValue(
                rows
            );

            const result = await service.workspacesJoinOutcomes(
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

            await service.workspacesJoinOutcomes(startDate, endDate);

            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.workspacesJoinOutcomes}:${startToken}:${endToken}`,
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

    describe('workspacesMembership', () => {
        it('returns the stored page for the signal with a null value filter and touches neither the repository nor the cache', async () => {
            analyticSnapshotService.getListOffset.mockResolvedValue(offsetPage);

            const result = await service.workspacesMembership(pagination);

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

    describe('workspacesActivityVolume', () => {
        it('passes the range, the contract actions, and the params to one repository method and returns its page unchanged', async () => {
            analyticWorkspaceRepository.groupActivityVolume.mockResolvedValue(
                offsetPage
            );

            const result = await service.workspacesActivityVolume(
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
        });

        it('reads through with the page key, AnalyticWorkspaceCountPageCacheSchema, and the dashboard TTL', async () => {
            cacheService.readThrough.mockResolvedValue(cachedValue);

            await service.workspacesActivityVolume(
                startDate,
                endDate,
                pagination
            );

            expect(cacheService.readThrough).toHaveBeenCalledWith(
                `${EnumAnalyticDashboardMetric.workspacesActivity}:${startToken}:${endToken}:1:20`,
                AnalyticWorkspaceCountPageCacheSchema,
                dashboardTtlInMs,
                expect.any(Function)
            );
        });
    });

    describe('summary', () => {
        it('reads through with the workspace summary key, AnalyticWorkspaceSummaryCacheSchema, and the dashboard TTL', async () => {
            const cached = {
                memberCount: 9,
                projectCount: 4,
                activityCount: 12,
            };
            cacheService.readThrough.mockResolvedValue(cached);

            const result = await service.summary(
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

            const result = await service.summary('workspace-1', null, null);

            expect(result).toEqual(counts);
            expect(
                analyticWorkspaceRepository.findSummary
            ).toHaveBeenCalledTimes(1);
            expect(
                analyticWorkspaceRepository.findSummary
            ).toHaveBeenCalledWith('workspace-1', null, null, [
                ...ActivityLogWorkspaceVolumeContract,
            ]);
        });
    });

    describe('inviteFunnel', () => {
        it('asks the repository with the workspace id', async () => {
            const rows = [{ status: 'pending', count: 2 }];
            analyticWorkspaceRepository.groupInviteFunnel.mockResolvedValue(
                rows
            );

            const result = await service.inviteFunnel(
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

    describe('joinOutcomes', () => {
        it('asks the repository with the workspace id', async () => {
            const rows = [{ status: 'approved', count: 1 }];
            analyticWorkspaceRepository.groupJoinOutcomes.mockResolvedValue(
                rows
            );

            const result = await service.joinOutcomes(
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

    describe('memberRoles', () => {
        it('returns the repository role counts', async () => {
            const rows = [{ role: 'admin', count: 2 }];
            analyticWorkspaceRepository.groupMemberRoles.mockResolvedValue(
                rows
            );

            const result = await service.memberRoles('workspace-1');

            expect(result).toEqual(rows);
            expect(
                analyticWorkspaceRepository.groupMemberRoles
            ).toHaveBeenCalledWith('workspace-1');
        });
    });
});
