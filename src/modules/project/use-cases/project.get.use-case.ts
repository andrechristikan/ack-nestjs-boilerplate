import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import type { IProjectContext } from '@modules/project/interfaces/project.interface';
import { ProjectService } from '@modules/project/services/project.service';

@Injectable()
export class ProjectGetUseCase implements IAppUseCase<
    [IProjectContext, IPolicyContext],
    IResponseReturn<Project>
> {
    constructor(
        private readonly projectService: ProjectService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        projectContext: IProjectContext,
        policyContext: IPolicyContext
    ): Promise<IResponseReturn<Project>> {
        const additionalWhere = this.policyAbilityService.scope(
            policyContext,
            EnumPolicyAction.read,
            EnumPolicySubject.Project
        );
        const { id, workspaceId } = projectContext.project;
        const project = await this.projectService.getScopedByIdAndWorkspace(
            id,
            workspaceId,
            additionalWhere
        );

        return { data: project };
    }
}
