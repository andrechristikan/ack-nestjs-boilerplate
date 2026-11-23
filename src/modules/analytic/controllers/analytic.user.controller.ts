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
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import { EnumFeatureFlagKey } from '@modules/feature-flag/enums/feature-flag.enum';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    WorkspaceContext,
    WorkspaceMemberProtected,
    WorkspaceProtected,
} from '@modules/workspace/decorators/workspace.decorator';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import {
    PolicyContext,
    PolicyProtected,
} from '@modules/policy/decorators/policy.decorator';
import { AnalyticSummaryUseCase } from '@modules/analytic/use-cases/analytic.summary.use-case';
import { AnalyticInviteFunnelUseCase } from '@modules/analytic/use-cases/analytic.invite-funnel.use-case';
import { AnalyticJoinOutcomesUseCase } from '@modules/analytic/use-cases/analytic.join-outcomes.use-case';
import { AnalyticMemberRolesUseCase } from '@modules/analytic/use-cases/analytic.member-roles.use-case';
import { AnalyticActivityUseCase } from '@modules/analytic/use-cases/analytic.activity.use-case';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';

@ApiTags('modules.user.analytic')
@Controller({
    version: '1',
    path: '/analytic',
})
export class AnalyticUserController {
    constructor(
        private readonly analyticSummaryUseCase: AnalyticSummaryUseCase,
        private readonly analyticInviteFunnelUseCase: AnalyticInviteFunnelUseCase,
        private readonly analyticJoinOutcomesUseCase: AnalyticJoinOutcomesUseCase,
        private readonly analyticMemberRolesUseCase: AnalyticMemberRolesUseCase,
        private readonly analyticActivityUseCase: AnalyticActivityUseCase
    ) {}

    @Doc({ summary: 'get current workspace analytic summary' })
    @Response('analytic.workspaceSummary', {
        schema: AnalyticWorkspaceSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.WorkspaceAnalytic,
        action: [EnumPolicyAction.read],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/workspace/summary')
    async workspaceSummary(
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticWorkspaceSummary>> {
        return this.analyticSummaryUseCase.execute(
            workspaceContext,
            policyContext,
            query
        );
    }

    @Doc({ summary: 'get current workspace invite funnel by date range' })
    @Response('analytic.workspaceInviteFunnel', {
        schema: AnalyticStatusCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.WorkspaceAnalytic,
        action: [EnumPolicyAction.read],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/workspace/invite-funnel')
    async inviteFunnel(
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticStatusCountList>> {
        return this.analyticInviteFunnelUseCase.execute(
            workspaceContext,
            policyContext,
            query
        );
    }

    @Doc({
        summary: 'get current workspace join request outcomes by date range',
    })
    @Response('analytic.workspaceJoinOutcomes', {
        schema: AnalyticStatusCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.WorkspaceAnalytic,
        action: [EnumPolicyAction.read],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/workspace/join-outcomes')
    async joinOutcomes(
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticStatusCountList>> {
        return this.analyticJoinOutcomesUseCase.execute(
            workspaceContext,
            policyContext,
            query
        );
    }

    @Doc({ summary: 'get current workspace member role distribution' })
    @Response('analytic.workspaceMemberRoles', {
        schema: AnalyticRoleCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.WorkspaceAnalytic,
        action: [EnumPolicyAction.read],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/workspace/member-roles')
    async memberRoles(
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext
    ): Promise<IResponseReturn<IAnalyticRoleCountList>> {
        return this.analyticMemberRolesUseCase.execute(
            workspaceContext,
            policyContext
        );
    }

    @Doc({ summary: 'get current workspace activity count by date range' })
    @Response('analytic.workspaceActivity', {
        schema: AnalyticMetricCountResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.WorkspaceAnalytic,
        action: [EnumPolicyAction.read],
    })
    @WorkspaceMemberProtected()
    @WorkspaceProtected()
    @UserProtected()
    @FeatureFlagProtected(EnumFeatureFlagKey.workspace)
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/workspace/activity')
    async activity(
        @WorkspaceContext() workspaceContext: IWorkspaceContext,
        @PolicyContext() policyContext: IPolicyContext,
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        return this.analyticActivityUseCase.execute(
            workspaceContext,
            policyContext,
            query
        );
    }
}
