import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { ProjectService } from '@modules/project/services/project.service';
import type { IWorkspaceSoftDeletePayload } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceProcessSoftDeleteUseCase implements IAppUseCase<
    [IWorkspaceSoftDeletePayload],
    IQueueResponse
> {
    private readonly timeoutInMs: number;

    constructor(
        private readonly workspaceService: WorkspaceService,
        private readonly projectService: ProjectService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService
    ) {
        this.timeoutInMs = this.configService.get<number>(
            'workspace.delete.timeoutInMs'
        )!;
    }

    async execute({
        workspaceId,
        deletedBy,
        activityLog,
    }: IWorkspaceSoftDeletePayload): Promise<IQueueResponse> {
        const message = this.messageService.setMessage(
            'workspace.queue.softDelete'
        );
        const deletedAt = this.helperDateService.now();
        try {
            await this.databaseService.withTransaction(
                async tx => {
                    const isDeleted =
                        await this.workspaceService.softDeleteInTx(
                            tx,
                            workspaceId,
                            deletedAt,
                            deletedBy
                        );
                    if (isDeleted) {
                        const entry =
                            this.activityLogQueue.recordEffectFromPayload(
                                activityLog,
                                {
                                    action: EnumActivityLogAction.workspaceDeleted,
                                    userId: deletedBy,
                                    createdBy: deletedBy,
                                    workspaceId,
                                }
                            );
                        await this.outboxService.addInTx(tx, entry);
                    }
                },
                { timeout: this.timeoutInMs }
            );

            let chunk: number;
            // Sequential by design: a fan-out over an unbounded collection: bounded chunks in turn, each concurrent
            do {
                chunk = await this.projectService.softDeleteChunkByWorkspace(
                    workspaceId,
                    deletedAt,
                    deletedBy
                );
            } while (chunk > 0);
        } catch (error: unknown) {
            if (
                error instanceof AppBaseException ||
                error instanceof QueueException
            ) {
                throw error;
            }

            const failure = this.messageService.setMessage(
                'workspace.queue.error.softDelete'
            );

            throw new QueueException(failure, true, error);
        }

        return { message };
    }
}
