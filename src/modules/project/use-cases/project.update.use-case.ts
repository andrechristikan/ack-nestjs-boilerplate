import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectService } from '@modules/project/services/project.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectUpdateUseCase implements IAppUseCase<
    [Project, string, ProjectUpdateRequestDto],
    IResponseReturn<Project>
> {
    constructor(
        private readonly projectService: ProjectService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        project: Project,
        actorId: string,
        { name, description }: ProjectUpdateRequestDto
    ): Promise<IResponseReturn<Project>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.projectUpdated,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
            }),
        ];

        const updated = await this.projectService.updateProject(project, {
            name,
            description,
        });

        this.activityLogService.stagePrepared(activityLogs);

        return { data: updated };
    }
}
