import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectService } from '@modules/project/services/project.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectCreateUseCase implements IAppUseCase<
    [string, string, ProjectCreateRequestDto],
    IResponseReturn<Project>
> {
    constructor(
        private readonly projectService: ProjectService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        workspaceId: string,
        actorId: string,
        { name, description }: ProjectCreateRequestDto
    ): Promise<IResponseReturn<Project>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.projectCreated,
                userId: actorId,
                createdBy: actorId,
                workspaceId,
            }),
        ];

        const project = await this.projectService.createProject(workspaceId, {
            name,
            description: description ?? null,
        });

        this.activityLogService.stagePrepared(activityLogs);

        return { data: project };
    }
}
