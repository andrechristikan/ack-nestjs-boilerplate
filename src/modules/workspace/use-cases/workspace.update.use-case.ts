import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { WorkspaceUpdateRequestDto } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceUpdateUseCase implements IAppUseCase<
    [string, string, WorkspaceUpdateRequestDto],
    IResponseReturn<Workspace>
> {
    constructor(
        private readonly workspaceService: WorkspaceService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        workspaceId: string,
        actorId: string,
        { name, description }: WorkspaceUpdateRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.workspaceUpdated,
                userId: actorId,
                createdBy: actorId,
                workspaceId,
            }),
        ];

        const workspace = await this.workspaceService.updateWorkspace(
            workspaceId,
            { name, description }
        );

        this.activityLogService.stagePrepared(activityLogs);

        return { data: workspace };
    }
}
