import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityLogAnalyticDomain } from '@modules/activity-log/domains/activity-log.analytic.domain';
import { AnalyticCache } from '@modules/analytic/caches/analytic.cache';
import { AnalyticWorkspaceUserDomain } from '@modules/analytic/domains/analytic.workspace-user.domain';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { ProjectAnalyticDomain } from '@modules/project/domains/project.analytic.domain';
import { WorkspaceInviteAnalyticDomain } from '@modules/workspace/domains/workspace.invite.analytic.domain';
import { WorkspaceJoinRequestAnalyticDomain } from '@modules/workspace/domains/workspace.join-request.analytic.domain';
import { WorkspaceMemberAnalyticDomain } from '@modules/workspace/domains/workspace.member.analytic.domain';

describe('AnalyticWorkspaceUserDomain', () => {
    const cache = createMock<AnalyticCache>();
    const dateUtil = createMock<AnalyticDateUtil>();
    const memberDomain = createMock<WorkspaceMemberAnalyticDomain>();
    const inviteDomain = createMock<WorkspaceInviteAnalyticDomain>();
    const joinRequestDomain = createMock<WorkspaceJoinRequestAnalyticDomain>();
    const projectDomain = createMock<ProjectAnalyticDomain>();
    const activityDomain = createMock<ActivityLogAnalyticDomain>();
    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-01-02T00:00:00.000Z');

    let domain: AnalyticWorkspaceUserDomain;

    beforeEach(() => {
        vi.resetAllMocks();
        cache.getDashboard.mockResolvedValue(null);
        dateUtil.cacheToken.mockImplementation(date =>
            date ? date.toISOString() : '_'
        );
        domain = new AnalyticWorkspaceUserDomain(
            cache,
            dateUtil,
            memberDomain,
            inviteDomain,
            joinRequestDomain,
            projectDomain,
            activityDomain
        );
    });

    it('returns a cached workspace summary without querying domains', async () => {
        const cached = { memberCount: 2, projectCount: 1, activityCount: 4 };
        cache.getDashboard.mockResolvedValue(cached);
        await expect(domain.summary('workspace-id')).resolves.toBe(cached);
        expect(memberDomain.countByWorkspace).not.toHaveBeenCalled();
    });

    it('builds and caches a date-scoped workspace summary', async () => {
        memberDomain.countByWorkspace.mockResolvedValue(3);
        projectDomain.countByWorkspace.mockResolvedValue(2);
        activityDomain.countByWorkspaceInRange.mockResolvedValue(7);
        const expected = { memberCount: 3, projectCount: 2, activityCount: 7 };
        await expect(
            domain.summary('workspace-id', startDate, endDate)
        ).resolves.toEqual(expected);
        expect(activityDomain.countByWorkspaceInRange).toHaveBeenCalledWith(
            'workspace-id',
            startDate,
            endDate
        );
        expect(cache.setDashboard).toHaveBeenCalledWith(
            'workspace.summary',
            `workspace-id:${startDate.toISOString()}:${endDate.toISOString()}`,
            '_',
            expected
        );
    });

    it('does not query activity without a complete date range', async () => {
        memberDomain.countByWorkspace.mockResolvedValue(1);
        projectDomain.countByWorkspace.mockResolvedValue(1);
        await expect(domain.summary('workspace-id')).resolves.toMatchObject({
            activityCount: 0,
        });
        expect(activityDomain.countByWorkspaceInRange).not.toHaveBeenCalled();
    });

    it('forwards workspace scope to invite and join analytics', async () => {
        await domain.inviteFunnel('workspace-id', startDate, endDate);
        await domain.joinOutcomes('workspace-id', startDate, endDate);
        expect(inviteDomain.funnel).toHaveBeenCalledWith(
            startDate,
            endDate,
            'workspace-id'
        );
        expect(joinRequestDomain.outcomes).toHaveBeenCalledWith(
            startDate,
            endDate,
            'workspace-id'
        );
    });

    it('wraps workspace activity count as a metric', async () => {
        activityDomain.countByWorkspaceInRange.mockResolvedValue(9);
        await expect(
            domain.activity('workspace-id', startDate, endDate)
        ).resolves.toEqual({ count: 9 });
    });
});
