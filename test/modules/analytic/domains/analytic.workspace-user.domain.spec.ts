import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticWorkspaceUserDomain } from '@modules/analytic/domains/analytic.workspace-user.domain';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { ProjectAnalyticDomain } from '@modules/project/domains/project.analytic.domain';
import { WorkspaceInviteAnalyticDomain } from '@modules/workspace/domains/workspace.invite.analytic.domain';
import { WorkspaceJoinRequestAnalyticDomain } from '@modules/workspace/domains/workspace.join-request.analytic.domain';
import { WorkspaceMemberAnalyticDomain } from '@modules/workspace/domains/workspace.member.analytic.domain';

describe('AnalyticWorkspaceUserDomain', () => {
    const analyticCache: MockProxy<AnalyticCache> = mock<AnalyticCache>();
    const analyticDateUtil: MockProxy<AnalyticDateUtil> =
        mock<AnalyticDateUtil>();
    const workspaceMemberAnalyticDomain: MockProxy<WorkspaceMemberAnalyticDomain> =
        mock<WorkspaceMemberAnalyticDomain>();
    const workspaceInviteAnalyticDomain: MockProxy<WorkspaceInviteAnalyticDomain> =
        mock<WorkspaceInviteAnalyticDomain>();
    const workspaceJoinRequestAnalyticDomain: MockProxy<WorkspaceJoinRequestAnalyticDomain> =
        mock<WorkspaceJoinRequestAnalyticDomain>();
    const projectAnalyticDomain: MockProxy<ProjectAnalyticDomain> =
        mock<ProjectAnalyticDomain>();
    const activityLogAnalyticDomain: MockProxy<ActivityLogAnalyticDomain> =
        mock<ActivityLogAnalyticDomain>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let domain: AnalyticWorkspaceUserDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        analyticDateUtil.workspaceWindowToken.mockReturnValue(
            'workspace-window'
        );
        analyticCache.getDashboard.mockResolvedValue(null);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticWorkspaceUserDomain,
                { provide: AnalyticCache, useValue: analyticCache },
                { provide: AnalyticDateUtil, useValue: analyticDateUtil },
                {
                    provide: WorkspaceMemberAnalyticDomain,
                    useValue: workspaceMemberAnalyticDomain,
                },
                {
                    provide: WorkspaceInviteAnalyticDomain,
                    useValue: workspaceInviteAnalyticDomain,
                },
                {
                    provide: WorkspaceJoinRequestAnalyticDomain,
                    useValue: workspaceJoinRequestAnalyticDomain,
                },
                {
                    provide: ProjectAnalyticDomain,
                    useValue: projectAnalyticDomain,
                },
                {
                    provide: ActivityLogAnalyticDomain,
                    useValue: activityLogAnalyticDomain,
                },
            ],
        }).compile();

        domain = module.get(AnalyticWorkspaceUserDomain);
    });

    describe('summary', () => {
        it('returns the cached summary on a cache hit', async () => {
            const cached = {
                memberCount: 9,
                projectCount: 4,
                activityCount: 12,
            };
            analyticCache.getDashboard.mockResolvedValue(cached);

            const result = await domain.summary(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toEqual(cached);
            expect(
                workspaceMemberAnalyticDomain.countByWorkspace
            ).not.toHaveBeenCalled();
            expect(analyticCache.setDashboard).not.toHaveBeenCalled();
        });

        it('computes member and project counts and skips activity when dates are omitted', async () => {
            workspaceMemberAnalyticDomain.countByWorkspace.mockResolvedValue(3);
            projectAnalyticDomain.countByWorkspace.mockResolvedValue(2);

            const result = await domain.summary('workspace-1');

            expect(result).toEqual({
                memberCount: 3,
                projectCount: 2,
                activityCount: 0,
            });
            expect(
                activityLogAnalyticDomain.countByWorkspaceInRange
            ).not.toHaveBeenCalled();
            expect(analyticCache.setDashboard).toHaveBeenCalledWith(
                'workspace.summary',
                'workspace-window',
                '_',
                {
                    memberCount: 3,
                    projectCount: 2,
                    activityCount: 0,
                }
            );
        });

        it('counts workspace activity when both dates are present', async () => {
            workspaceMemberAnalyticDomain.countByWorkspace.mockResolvedValue(3);
            projectAnalyticDomain.countByWorkspace.mockResolvedValue(2);
            activityLogAnalyticDomain.countByWorkspaceInRange.mockResolvedValue(
                9
            );

            const result = await domain.summary(
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
                activityLogAnalyticDomain.countByWorkspaceInRange
            ).toHaveBeenCalledWith('workspace-1', startDate, endDate);
        });
    });

    describe('inviteFunnel', () => {
        it('delegates to the workspace invite analytic domain', async () => {
            const rows = [{ status: 'pending', count: 2 }];
            workspaceInviteAnalyticDomain.funnel.mockResolvedValue(rows);

            const result = await domain.inviteFunnel(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toEqual(rows);
            expect(workspaceInviteAnalyticDomain.funnel).toHaveBeenCalledWith(
                startDate,
                endDate,
                'workspace-1'
            );
        });
    });

    describe('joinOutcomes', () => {
        it('delegates to the workspace join-request analytic domain', async () => {
            const rows = [{ status: 'approved', count: 1 }];
            workspaceJoinRequestAnalyticDomain.outcomes.mockResolvedValue(rows);

            const result = await domain.joinOutcomes(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toEqual(rows);
            expect(
                workspaceJoinRequestAnalyticDomain.outcomes
            ).toHaveBeenCalledWith(startDate, endDate, 'workspace-1');
        });
    });

    describe('memberRoles', () => {
        it('delegates to the workspace member analytic domain', async () => {
            const rows = [{ role: 'admin', count: 2 }];
            workspaceMemberAnalyticDomain.roles.mockResolvedValue(rows);

            const result = await domain.memberRoles('workspace-1');

            expect(result).toEqual(rows);
            expect(workspaceMemberAnalyticDomain.roles).toHaveBeenCalledWith(
                'workspace-1'
            );
        });
    });

    describe('activity', () => {
        it('wraps the workspace activity count', async () => {
            activityLogAnalyticDomain.countByWorkspaceInRange.mockResolvedValue(
                12
            );

            const result = await domain.activity(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toEqual({ count: 12 });
            expect(
                activityLogAnalyticDomain.countByWorkspaceInRange
            ).toHaveBeenCalledWith('workspace-1', startDate, endDate);
        });
    });
});
