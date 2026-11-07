import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ActivityLogAnalyticService } from '@modules/activity-log/services/activity-log.analytic.service';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticWorkspaceUserService } from '@modules/analytic/services/analytic.workspace-user.service';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { ProjectAnalyticService } from '@modules/project/services/project.analytic.service';
import { WorkspaceInviteAnalyticService } from '@modules/workspace/services/workspace.invite.analytic.service';
import { WorkspaceJoinRequestAnalyticService } from '@modules/workspace/services/workspace.join-request.analytic.service';
import { WorkspaceMemberAnalyticService } from '@modules/workspace/services/workspace.member.analytic.service';

describe('AnalyticWorkspaceUserService', () => {
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>();
    const analyticDateUtil: MockProxy<AnalyticDateUtil> =
        mock<AnalyticDateUtil>();
    const workspaceMemberAnalyticService: MockProxy<WorkspaceMemberAnalyticService> =
        mock<WorkspaceMemberAnalyticService>();
    const workspaceInviteAnalyticService: MockProxy<WorkspaceInviteAnalyticService> =
        mock<WorkspaceInviteAnalyticService>();
    const workspaceJoinRequestAnalyticService: MockProxy<WorkspaceJoinRequestAnalyticService> =
        mock<WorkspaceJoinRequestAnalyticService>();
    const projectAnalyticService: MockProxy<ProjectAnalyticService> =
        mock<ProjectAnalyticService>();
    const activityLogAnalyticService: MockProxy<ActivityLogAnalyticService> =
        mock<ActivityLogAnalyticService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let service: AnalyticWorkspaceUserService;

    beforeEach(async () => {
        vi.resetAllMocks();

        analyticDateUtil.workspaceWindowToken.mockReturnValue(
            'workspace-window'
        );
        analyticCache.getDashboard.mockResolvedValue(null);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticWorkspaceUserService,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: AnalyticDateUtil, useValue: analyticDateUtil },
                {
                    provide: WorkspaceMemberAnalyticService,
                    useValue: workspaceMemberAnalyticService,
                },
                {
                    provide: WorkspaceInviteAnalyticService,
                    useValue: workspaceInviteAnalyticService,
                },
                {
                    provide: WorkspaceJoinRequestAnalyticService,
                    useValue: workspaceJoinRequestAnalyticService,
                },
                {
                    provide: ProjectAnalyticService,
                    useValue: projectAnalyticService,
                },
                {
                    provide: ActivityLogAnalyticService,
                    useValue: activityLogAnalyticService,
                },
            ],
        }).compile();

        service = module.get(AnalyticWorkspaceUserService);
    });

    describe('summary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = {
                memberCount: 9,
                projectCount: 4,
                activityCount: 12,
            };
            analyticCache.getDashboard.mockResolvedValue(cached);

            const result = await service.summary(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toEqual(cached);
            expect(
                workspaceMemberAnalyticService.getCountByWorkspace
            ).not.toHaveBeenCalled();
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });

        it('counts all-time workspace activity when dates are omitted', async () => {
            workspaceMemberAnalyticService.getCountByWorkspace.mockResolvedValue(
                3
            );
            projectAnalyticService.getCountByWorkspace.mockResolvedValue(2);
            activityLogAnalyticService.getCountByWorkspaceInRange.mockResolvedValue(
                21
            );

            const result = await service.summary('workspace-1', null, null);

            expect(result).toEqual({
                memberCount: 3,
                projectCount: 2,
                activityCount: 21,
            });
            expect(
                activityLogAnalyticService.getCountByWorkspaceInRange
            ).toHaveBeenCalledWith('workspace-1', null, null);
            expect(analyticCache.setDashboard).toHaveBeenCalledWith(
                'workspace.summary',
                'workspace-window',
                '_',
                {
                    memberCount: 3,
                    projectCount: 2,
                    activityCount: 21,
                }
            );
        });

        it('counts workspace activity when both dates are present', async () => {
            workspaceMemberAnalyticService.getCountByWorkspace.mockResolvedValue(
                3
            );
            projectAnalyticService.getCountByWorkspace.mockResolvedValue(2);
            activityLogAnalyticService.getCountByWorkspaceInRange.mockResolvedValue(
                9
            );

            const result = await service.summary(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toEqual({
                memberCount: 3,
                projectCount: 2,
                activityCount: 9,
            });
            expect(
                activityLogAnalyticService.getCountByWorkspaceInRange
            ).toHaveBeenCalledWith('workspace-1', startDate, endDate);
        });
    });

    describe('inviteFunnel', () => {
        it('delegates to the workspace invite analytic domain', async () => {
            const rows = [{ status: 'pending', count: 2 }];
            workspaceInviteAnalyticService.getFunnel.mockResolvedValue(rows);

            const result = await service.inviteFunnel(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toEqual(rows);
            expect(
                workspaceInviteAnalyticService.getFunnel
            ).toHaveBeenCalledWith(startDate, endDate, 'workspace-1');
        });
    });

    describe('joinOutcomes', () => {
        it('delegates to the workspace join-request analytic domain', async () => {
            const rows = [{ status: 'approved', count: 1 }];
            workspaceJoinRequestAnalyticService.getOutcomes.mockResolvedValue(
                rows
            );

            const result = await service.joinOutcomes(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toEqual(rows);
            expect(
                workspaceJoinRequestAnalyticService.getOutcomes
            ).toHaveBeenCalledWith(startDate, endDate, 'workspace-1');
        });
    });

    describe('memberRoles', () => {
        it('delegates to the workspace member analytic domain', async () => {
            const rows = [{ role: 'admin', count: 2 }];
            workspaceMemberAnalyticService.getRoles.mockResolvedValue(rows);

            const result = await service.memberRoles('workspace-1');

            expect(result).toEqual(rows);
            expect(
                workspaceMemberAnalyticService.getRoles
            ).toHaveBeenCalledWith('workspace-1');
        });
    });

    describe('activity', () => {
        it('wraps the workspace activity count', async () => {
            activityLogAnalyticService.getCountByWorkspaceInRange.mockResolvedValue(
                12
            );

            const result = await service.activity(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 12 });
            expect(
                activityLogAnalyticService.getCountByWorkspaceInRange
            ).toHaveBeenCalledWith('workspace-1', startDate, endDate);
        });
    });
});
