import {
    IAnalyticMetricCount,
    IAnalyticRoleCount,
    IAnalyticStatusCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import { Response } from '@common/response/decorators/response.decorator';
import { AnalyticUserMetricDoc } from '@modules/analytic/docs/analytic.user.doc';
import {
    AnalyticDateRangeRequestDto,
    AnalyticDateRangeRequestSchema,
} from '@modules/analytic/dtos/request/analytic.date-range.request.dto';
import { AnalyticJsonResponseSchema } from '@modules/analytic/dtos/response/analytic.metric.response.dto';
import { AnalyticWorkspaceUserHttpService } from '@modules/analytic/services/analytic.workspace-user.http.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    WorkspaceCurrent,
    WorkspaceMemberProtected,
    WorkspaceProtected,
} from '@modules/workspace/decorators/workspace.decorator';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EnumWorkspaceMemberRole, Workspace } from '@generated/prisma-client';

@ApiTags('modules.user.analytic')
@Controller({
    version: '1',
    path: '/analytic',
})
export class AnalyticUserAdminController {
    constructor(
        private readonly analyticWorkspaceUserHttpService: AnalyticWorkspaceUserHttpService
    ) {}

    @AnalyticUserMetricDoc('workspace invite funnel')
    @Response('analytic.workspaceInviteFunnel', {
        schema: AnalyticJsonResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/workspace/invite-funnel')
    async inviteFunnel(
        @WorkspaceCurrent() workspace: Workspace,
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticStatusCount[]> {
        return this.analyticWorkspaceUserHttpService.inviteFunnel(
            workspace.id,
            query.startDate,
            query.endDate
        );
    }

    @AnalyticUserMetricDoc('workspace join outcomes')
    @Response('analytic.workspaceJoinOutcomes', {
        schema: AnalyticJsonResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/workspace/join-outcomes')
    async joinOutcomes(
        @WorkspaceCurrent() workspace: Workspace,
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticStatusCount[]> {
        return this.analyticWorkspaceUserHttpService.joinOutcomes(
            workspace.id,
            query.startDate,
            query.endDate
        );
    }

    @AnalyticUserMetricDoc('workspace member roles')
    @Response('analytic.workspaceMemberRoles', {
        schema: AnalyticJsonResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/workspace/member-roles')
    async memberRoles(
        @WorkspaceCurrent() workspace: Workspace
    ): Promise<IAnalyticRoleCount[]> {
        return this.analyticWorkspaceUserHttpService.memberRoles(workspace.id);
    }

    @AnalyticUserMetricDoc('workspace activity')
    @Response('analytic.workspaceActivity', {
        schema: AnalyticJsonResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/workspace/activity')
    async activity(
        @WorkspaceCurrent() workspace: Workspace,
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticMetricCount> {
        return this.analyticWorkspaceUserHttpService.activity(
            workspace.id,
            query.startDate,
            query.endDate
        );
    }
}
