import { subject } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticWorkspaceUserService } from '@modules/analytic/services/analytic.workspace-user.service';
import type { IAnalyticMetricCount } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import type { AnalyticDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class AnalyticActivityUseCase implements IAppUseCase<
    [IWorkspaceContext, IPolicyContext, AnalyticDateRangeRequestDto],
    IResponseReturn<IAnalyticMetricCount>
> {
    constructor(
        private readonly analyticWorkspaceUserService: AnalyticWorkspaceUserService,
        private readonly analyticDateService: AnalyticDateService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        workspaceContext: IWorkspaceContext,
        policyContext: IPolicyContext,
        { startDate, endDate }: AnalyticDateRangeRequestDto
    ): Promise<IResponseReturn<IAnalyticMetricCount>> {
        this.policyAbilityService.authorize(
            policyContext,
            EnumPolicyAction.read,
            subject(EnumPolicySubject.WorkspaceAnalytic, {
                workspaceId: workspaceContext.workspace.id,
            })
        );
        const range = this.analyticDateService.requireRange(startDate, endDate);
        const data = await this.analyticWorkspaceUserService.activity(
            workspaceContext.workspace.id,
            range.startDate,
            range.endDate
        );

        return { data };
    }
}
