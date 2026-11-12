import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Project } from '@generated/prisma-client/client';
import type { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectService } from '@modules/project/services/project.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectCreateUseCase implements IAppUseCase<
    [string, string, ProjectCreateRequestDto, IRequestContext],
    IResponseReturn<Project>
> {
    constructor(private readonly projectService: ProjectService) {}

    async execute(
        workspaceId: string,
        actorId: string,
        { name, description }: ProjectCreateRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<Project>> {
        const project = await this.projectService.createProject(
            workspaceId,
            actorId,
            {
                name,
                description: description ?? null,
            },
            context
        );

        return { data: project };
    }
}
