import { subject } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticWorkspaceUserService } from '@modules/analytic/services/analytic.workspace-user.service';
import type { IAnalyticRoleCountList } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class AnalyticMemberRolesUseCase implements IAppUseCase<
    [IWorkspaceContext, IPolicyContext],
    IResponseReturn<IAnalyticRoleCountList>
> {
    constructor(
        private readonly analyticWorkspaceUserService: AnalyticWorkspaceUserService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        workspaceContext: IWorkspaceContext,
        policyContext: IPolicyContext
    ): Promise<IResponseReturn<IAnalyticRoleCountList>> {
        this.policyAbilityService.authorize(
            policyContext,
            EnumPolicyAction.read,
            subject(EnumPolicySubject.WorkspaceAnalytic, {
                workspaceId: workspaceContext.workspace.id,
            })
        );
        const roles = await this.analyticWorkspaceUserService.memberRoles(
            workspaceContext.workspace.id
        );

        return { data: { roles } };
    }
}
