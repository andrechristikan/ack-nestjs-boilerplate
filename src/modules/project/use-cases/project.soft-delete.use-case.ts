import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectService } from '@modules/project/services/project.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IProjectContext } from '@modules/project/interfaces/project.interface';

@Injectable()
export class ProjectSoftDeleteUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, IAuthJwtAccessContext, IProjectContext],
    IResponseReturn<void>
> {
    constructor(
        private readonly projectService: ProjectService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        projectContext: IProjectContext
    ): Promise<IResponseReturn<void>> {
        const project = projectContext.project;
        const actorId = authContext.userId;
        const deletedAt = this.helperDateService.now();
        await this.databaseService.withTransaction(async tx => {
            const softDeleted = await this.projectService.softDeleteProjectInTx(
                tx,
                project,
                deletedAt,
                actorId
            );
            await this.workspaceInviteService.clearProjectInTx(tx, project.id);
            const entry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.projectDeleted,
                    userId: actorId,
                    createdBy: actorId,
                    workspaceId: softDeleted.workspaceId,
                }
            );
            await this.outboxService.addInTx(tx, entry);
        });

        return {};
    }
}
