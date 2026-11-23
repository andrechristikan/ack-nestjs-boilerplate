import { subject } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Workspace } from '@generated/prisma-client/client';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class WorkspaceGetCurrentUseCase implements IAppUseCase<
    [IWorkspaceContext, IPolicyContext],
    IResponseReturn<Workspace>
> {
    constructor(private readonly policyAbilityService: PolicyAbilityService) {}

    async execute(
        workspaceContext: IWorkspaceContext,
        policyContext: IPolicyContext
    ): Promise<IResponseReturn<Workspace>> {
        this.policyAbilityService.authorize(
            policyContext,
            EnumPolicyAction.read,
            subject(EnumPolicySubject.Workspace, workspaceContext.workspace)
        );

        return { data: workspaceContext.workspace };
    }
}
