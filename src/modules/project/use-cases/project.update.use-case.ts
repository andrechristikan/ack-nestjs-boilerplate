import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Project } from '@generated/prisma-client/client';
import type { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectService } from '@modules/project/services/project.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectUpdateUseCase implements IAppUseCase<
    [Project, string, ProjectUpdateRequestDto, IRequestContext],
    IResponseReturn<Project>
> {
    constructor(private readonly projectService: ProjectService) {}

    async execute(
        project: Project,
        actorId: string,
        { name, description }: ProjectUpdateRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<Project>> {
        const updated = await this.projectService.updateProject(
            project,
            actorId,
            { name, description },
            context
        );

        return { data: updated };
    }
}
