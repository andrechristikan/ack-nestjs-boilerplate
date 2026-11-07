import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { WorkspaceUpdateSlugRequestDto } from '@modules/workspace/dtos/request/workspace.update-slug.request.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceUpdateSlugUseCase implements IAppUseCase<
    [string, string, WorkspaceUpdateSlugRequestDto],
    IResponseReturn<Workspace>
> {
    constructor(
        private readonly workspaceService: WorkspaceService,
        private readonly activityLogService: ActivityLogService
    ) {}

    async execute(
        workspaceId: string,
        actorId: string,
        { slug }: WorkspaceUpdateSlugRequestDto
    ): Promise<IResponseReturn<Workspace>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.workspaceUpdated,
                userId: actorId,
                createdBy: actorId,
                workspaceId,
            }),
        ];

        const workspace = await this.workspaceService.updateWorkspaceSlug(
            workspaceId,
            slug
        );

        this.activityLogService.stagePrepared(activityLogs);

        return { data: workspace };
    }
}
