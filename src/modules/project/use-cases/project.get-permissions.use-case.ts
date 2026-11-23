import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumPolicySubject } from '@generated/prisma-client/client';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import type { ProjectPermissionResponseDto } from '@modules/project/dtos/response/project.permission.response.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectGetPermissionsUseCase implements IAppUseCase<
    [IPolicyContext],
    IResponseReturn<ProjectPermissionResponseDto>
> {
    constructor(private readonly policyAbilityService: PolicyAbilityService) {}

    async execute(
        policyContext: IPolicyContext
    ): Promise<IResponseReturn<ProjectPermissionResponseDto>> {
        const permissions = this.policyAbilityService.getEffectivePermissions(
            policyContext,
            [EnumPolicySubject.Project, EnumPolicySubject.ProjectMember]
        );

        return { data: { permissions } };
    }
}
