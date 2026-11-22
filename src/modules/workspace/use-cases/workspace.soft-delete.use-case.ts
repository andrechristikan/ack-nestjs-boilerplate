import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { WorkspaceSoftDeleteResponseDto } from '@modules/workspace/dtos/response/workspace.soft-delete.response.dto';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceQueue } from '@modules/workspace/queues/workspace.queue';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceSoftDeleteUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, IAuthJwtAccessContext, IWorkspaceContext],
    IResponseReturn<WorkspaceSoftDeleteResponseDto>
> {
    constructor(
        private readonly workspaceQueue: WorkspaceQueue,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext
    ): Promise<IResponseReturn<WorkspaceSoftDeleteResponseDto>> {
        const activityLog = this.activityLogQueue.toPayload(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceContext
        );
        const effect = this.workspaceQueue.softDeleteEffect(
            workspaceContext.workspace.id,
            authContext.userId,
            activityLog
        );
        const outboxId = await this.databaseService.withTransaction(async tx =>
            this.outboxService.addInTx(tx, effect)
        );

        return { data: { outboxId } };
    }
}
