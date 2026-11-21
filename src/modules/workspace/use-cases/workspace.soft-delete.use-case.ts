import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectService } from '@modules/project/services/project.service';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class WorkspaceSoftDeleteUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, IAuthJwtAccessContext, IWorkspaceContext],
    IResponseReturn<void>
> {
    private readonly timeoutInMs: number;

    constructor(
        private readonly workspaceService: WorkspaceService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly projectService: ProjectService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.timeoutInMs = this.configService.get<number>(
            'workspace.delete.timeoutInMs'
        )!;
    }

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext
    ): Promise<IResponseReturn<void>> {
        const workspaceId = workspaceContext.workspace.id;
        const actorId = authContext.userId;
        const deletedAt = this.helperDateService.create();
        try {
            await this.databaseService.withTransaction(
                async tx => {
                    await this.workspaceService.softDeleteInTx(
                        tx,
                        workspaceId,
                        deletedAt,
                        actorId
                    );
                    await this.projectService.softDeleteByWorkspaceInTx(
                        tx,
                        workspaceId,
                        deletedAt,
                        actorId
                    );
                    await this.workspaceInviteService.revokePendingByWorkspaceInTx(
                        tx,
                        workspaceId
                    );
                    await this.workspaceJoinRequestService.cancelPendingByWorkspaceInTx(
                        tx,
                        workspaceId
                    );
                    const entry = this.activityLogQueue.recordEffect(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        workspaceContext,
                        {
                            action: EnumActivityLogAction.workspaceDeleted,
                            userId: actorId,
                            createdBy: actorId,
                            workspaceId,
                        }
                    );
                    await this.outboxService.addInTx(tx, entry);
                },
                { timeout: this.timeoutInMs }
            );
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceNotFoundException();
            }

            throw new AppUnknownException(err);
        }

        return {};
    }
}
