import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Project } from '@generated/prisma-client/client';
import { ProjectService } from '@modules/project/services/project.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectGetByIdByAdminUseCase implements IAppUseCase<
    [IPolicyContext, string],
    IResponseReturn<Project>
> {
    constructor(
        private readonly projectService: ProjectService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        policyContext: IPolicyContext,
        projectId: string
    ): Promise<IResponseReturn<Project>> {
        const additionalWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.read,
            EnumPolicySubject.Project
        );
        const project = await this.projectService.getByIdByAdmin(
            projectId,
            additionalWhere
        );

        return { data: project };
    }
}
