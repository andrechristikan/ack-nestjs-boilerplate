import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Project } from '@generated/prisma-client/client';
import type { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectService } from '@modules/project/services/project.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IProjectContext } from '@modules/project/interfaces/project.interface';

@Injectable()
export class ProjectUpdateUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IProjectContext,
        ProjectUpdateRequestDto,
    ],
    IResponseReturn<Project>
> {
    constructor(private readonly projectService: ProjectService) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        projectContext: IProjectContext,
        { name, description }: ProjectUpdateRequestDto
    ): Promise<IResponseReturn<Project>> {
        const updated = await this.projectService.updateProject(
            requestContext,
            apiKeyContext,
            authContext,
            projectContext.project,
            { name, description }
        );

        return { data: updated };
    }
}
