import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticMetricCountResponseSchema } from '@modules/analytic/dtos/response/analytic.metric-count.response.dto';
import { AnalyticRoleCountResponseSchema } from '@modules/analytic/dtos/response/analytic.role-count.response.dto';
import { AnalyticStatusCountResponseSchema } from '@modules/analytic/dtos/response/analytic.status-count.response.dto';
import { Response } from '@common/response/decorators/response.decorator';
import { AnalyticDateRangeRequestSchema } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';
import type { AnalyticDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';
import { AnalyticOptionalDateRangeRequestSchema } from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';
import type { AnalyticOptionalDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';
import { AnalyticWorkspaceSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.workspace-summary.response.dto';
import type {
    IAnalyticMetricCount,
    IAnalyticRoleCountList,
    IAnalyticStatusCountList,
    IAnalyticWorkspaceSummary,
} from '@modules/analytic/interfaces/analytic.interface';
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
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';

@ApiTags('modules.user.analytic')
@Controller({
    version: '1',
    path: '/analytic',
})
export class AnalyticUserController {
    constructor(
        private readonly analyticWorkspaceUserHttpService: AnalyticWorkspaceUserHttpService
    ) {}

    @Doc({ summary: 'get current workspace analytic summary' })
    @Response('analytic.workspaceSummary', {
        schema: AnalyticWorkspaceSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected('workspace')
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/workspace/summary')
    async workspaceSummary(
        @WorkspaceCurrent() workspace: Workspace,
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticWorkspaceSummary>> {
        return this.analyticWorkspaceUserHttpService.summary(
            workspace.id,
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'get current workspace invite funnel by date range' })
    @Response('analytic.workspaceInviteFunnel', {
        schema: AnalyticStatusCountResponseSchema,
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
    ): Promise<IResponseReturn<IAnalyticStatusCountList>> {
        return this.analyticWorkspaceUserHttpService.inviteFunnel(
            workspace.id,
            query.startDate,
            query.endDate
        );
    }

    @Doc({
        summary: 'get current workspace join request outcomes by date range',
    })
    @Response('analytic.workspaceJoinOutcomes', {
        schema: AnalyticStatusCountResponseSchema,
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
    ): Promise<IResponseReturn<IAnalyticStatusCountList>> {
        return this.analyticWorkspaceUserHttpService.joinOutcomes(
            workspace.id,
            query.startDate,
            query.endDate
        );
    }

    @Doc({ summary: 'get current workspace member role distribution' })
    @Response('analytic.workspaceMemberRoles', {
        schema: AnalyticRoleCountResponseSchema,
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
    ): Promise<IResponseReturn<IAnalyticRoleCountList>> {
        return this.analyticWorkspaceUserHttpService.memberRoles(workspace.id);
    }

    @Doc({ summary: 'get current workspace activity count by date range' })
    @Response('analytic.workspaceActivity', {
        schema: AnalyticMetricCountResponseSchema,
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
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticWorkspaceUserHttpService.activity(
            workspace.id,
            query.startDate,
            query.endDate
        );
    }
}
