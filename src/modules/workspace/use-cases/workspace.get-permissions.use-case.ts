import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumPolicySubject } from '@generated/prisma-client/client';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import type { WorkspacePermissionResponseDto } from '@modules/workspace/dtos/response/workspace.permission.response.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceGetPermissionsUseCase implements IAppUseCase<
    [IPolicyContext],
    IResponseReturn<WorkspacePermissionResponseDto>
> {
    constructor(private readonly policyAbilityService: PolicyAbilityService) {}

    async execute(
        policyContext: IPolicyContext
    ): Promise<IResponseReturn<WorkspacePermissionResponseDto>> {
        const permissions = this.policyAbilityService.getEffectivePermissions(
            policyContext,
            [
                EnumPolicySubject.Workspace,
                EnumPolicySubject.WorkspaceMember,
                EnumPolicySubject.WorkspaceInvite,
                EnumPolicySubject.WorkspaceJoinRequest,
                EnumPolicySubject.Project,
                EnumPolicySubject.ProjectMember,
                EnumPolicySubject.WorkspaceAnalytic,
            ]
        );

        return { data: { permissions } };
    }
}
