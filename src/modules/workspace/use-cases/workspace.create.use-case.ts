import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceCreateUseCase implements IAppUseCase<
    [string, WorkspaceCreateRequestDto],
    IResponseReturn<Workspace>
> {
    constructor(
        private readonly workspaceService: WorkspaceService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        userId: string,
        { name, description, isPublic }: WorkspaceCreateRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const workspace = await this.workspaceService.createWorkspace(userId, {
            name,
            description: description ?? null,
            isPublic: isPublic ?? null,
        });

        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.workspaceCreated,
                userId,
                createdBy: userId,
                workspaceId: workspace.id,
            }),
        ];
        this.activityLogService.stagePrepared(activityLogs);

        return { data: workspace };
    }
}
