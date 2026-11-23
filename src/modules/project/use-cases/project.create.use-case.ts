import { subject } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Project } from '@generated/prisma-client/client';
import type { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectService } from '@modules/project/services/project.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class ProjectCreateUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IWorkspaceContext,
        IPolicyContext,
        ProjectCreateRequestDto,
    ],
    IResponseReturn<Project>
> {
    constructor(
        private readonly projectService: ProjectService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext,
        policyContext: IPolicyContext,
        { name, description }: ProjectCreateRequestDto
    ): Promise<IResponseReturn<Project>> {
        this.policyAbilityService.authorize(
            policyContext,
            EnumPolicyAction.create,
            subject(EnumPolicySubject.Project, {
                workspaceId: workspaceContext.workspace.id,
            })
        );
        const project = await this.projectService.createProject(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext.workspace.id,
            {
                name,
                description: description ?? null,
            }
        );

        return { data: project };
    }
}
