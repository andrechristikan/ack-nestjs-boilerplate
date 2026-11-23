import { subject } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticWorkspaceUserService } from '@modules/analytic/services/analytic.workspace-user.service';
import type { IAnalyticWorkspaceSummary } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import type { AnalyticOptionalDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class AnalyticSummaryUseCase implements IAppUseCase<
    [IWorkspaceContext, IPolicyContext, AnalyticOptionalDateRangeRequestDto],
    IResponseReturn<IAnalyticWorkspaceSummary>
> {
    constructor(
        private readonly analyticWorkspaceUserService: AnalyticWorkspaceUserService,
        private readonly analyticDateService: AnalyticDateService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        workspaceContext: IWorkspaceContext,
        policyContext: IPolicyContext,
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticWorkspaceSummary>> {
        this.policyAbilityService.authorize(
            policyContext,
            EnumPolicyAction.read,
            subject(EnumPolicySubject.WorkspaceAnalytic, {
                workspaceId: workspaceContext.workspace.id,
            })
        );
        const range = this.analyticDateService.optionalRange(
            query.startDate ?? null,
            query.endDate ?? null
        );
        const data = await this.analyticWorkspaceUserService.summary(
            workspaceContext.workspace.id,
            range.startDate,
            range.endDate
        );

        return { data };
    }
}
