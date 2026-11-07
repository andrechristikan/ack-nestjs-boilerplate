import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { Project } from '@generated/prisma-client/client';
import { ProjectService } from '@modules/project/services/project.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectGetByIdByAdminUseCase implements IAppUseCase<
    [string],
    IResponseReturn<Project>
> {
    constructor(private readonly projectService: ProjectService) {}

    async execute(projectId: string): Promise<IResponseReturn<Project>> {
        const project = await this.projectService.getByIdByAdmin(projectId);

        return { data: project };
    }
}
