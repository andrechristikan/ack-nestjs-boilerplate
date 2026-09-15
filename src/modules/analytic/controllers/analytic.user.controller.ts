import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import { Response } from '@common/response/decorators/response.decorator';
import { AnalyticUserSummaryDoc } from '@modules/analytic/docs/analytic.user.doc';
import {
    AnalyticOptionalDateRangeRequestDto,
    AnalyticOptionalDateRangeRequestSchema,
} from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';
import { AnalyticWorkspaceSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.metric.response.dto';
import { IAnalyticWorkspaceSummary } from '@modules/analytic/interfaces/analytic.interface';
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
import { Workspace } from '@generated/prisma-client';

@ApiTags('modules.user.analytic')
@Controller({
    version: '1',
    path: '/analytic',
})
export class AnalyticUserController {
    constructor(
        private readonly analyticWorkspaceUserHttpService: AnalyticWorkspaceUserHttpService
    ) {}

    @AnalyticUserSummaryDoc()
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
    ): Promise<IAnalyticWorkspaceSummary> {
        return this.analyticWorkspaceUserHttpService.summary(
            workspace.id,
            query.startDate,
            query.endDate
        );
    }
}
