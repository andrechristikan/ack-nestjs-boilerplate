import {
    Doc,
    DocAuth,
    DocGuard,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { AnalyticMetricCountResponseSchema } from '@modules/analytic/dtos/response/analytic.metric-count.response.dto';
import { AnalyticRoleCountResponseSchema } from '@modules/analytic/dtos/response/analytic.role-count.response.dto';
import { AnalyticStatusCountResponseSchema } from '@modules/analytic/dtos/response/analytic.status-count.response.dto';
import { AnalyticWorkspaceSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.workspace-summary.response.dto';
import type { AnalyticMetricCountResponseDto } from '@modules/analytic/dtos/response/analytic.metric-count.response.dto';
import type { AnalyticRoleCountResponseDto } from '@modules/analytic/dtos/response/analytic.role-count.response.dto';
import type { AnalyticStatusCountResponseDto } from '@modules/analytic/dtos/response/analytic.status-count.response.dto';
import type { AnalyticWorkspaceSummaryResponseDto } from '@modules/analytic/dtos/response/analytic.workspace-summary.response.dto';
import { applyDecorators } from '@nestjs/common';

export function AnalyticUserWorkspaceSummaryDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get current workspace analytic summary' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            featureFlag: true,
            workspace: true,
        }),
        DocResponse<AnalyticWorkspaceSummaryResponseDto>(
            'analytic.workspaceSummary',
            {
                schema: AnalyticWorkspaceSummaryResponseSchema,
            }
        )
    );
}

export function AnalyticUserWorkspaceInviteFunnelDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get current workspace invite funnel by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            featureFlag: true,
            workspace: true,
            workspaceRole: true,
        }),
        DocResponse<AnalyticStatusCountResponseDto>(
            'analytic.workspaceInviteFunnel',
            {
                schema: AnalyticStatusCountResponseSchema,
            }
        )
    );
}

export function AnalyticUserWorkspaceJoinOutcomesDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'get current workspace join request outcomes by date range',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            featureFlag: true,
            workspace: true,
            workspaceRole: true,
        }),
        DocResponse<AnalyticStatusCountResponseDto>(
            'analytic.workspaceJoinOutcomes',
            {
                schema: AnalyticStatusCountResponseSchema,
            }
        )
    );
}

export function AnalyticUserWorkspaceMemberRolesDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get current workspace member role distribution' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            featureFlag: true,
            workspace: true,
            workspaceRole: true,
        }),
        DocResponse<AnalyticRoleCountResponseDto>(
            'analytic.workspaceMemberRoles',
            {
                schema: AnalyticRoleCountResponseSchema,
            }
        )
    );
}

export function AnalyticUserWorkspaceActivityDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'get current workspace activity count by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({
            user: true,
            termPolicy: true,
            featureFlag: true,
            workspace: true,
            workspaceRole: true,
        }),
        DocResponse<AnalyticMetricCountResponseDto>(
            'analytic.workspaceActivity',
            {
                schema: AnalyticMetricCountResponseSchema,
            }
        )
    );
}
