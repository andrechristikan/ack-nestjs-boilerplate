import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ProjectService } from '@modules/project/services/project.service';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class WorkspaceSoftDeleteUseCase implements IAppUseCase<
    [string, string],
    IResponseReturn<void>
> {
    private readonly deleteTimeoutInMs: number;

    constructor(
        private readonly workspaceService: WorkspaceService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly projectService: ProjectService,
        private readonly activityLogService: ActivityLogService,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.deleteTimeoutInMs = this.configService.get<number>(
            'workspace.delete.timeoutInMs'
        )!;
    }

    async execute(
        workspaceId: string,
        actorId: string
    ): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.workspaceDeleted,
                userId: actorId,
                createdBy: actorId,
                workspaceId,
            }),
        ];

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
                },
                { timeout: this.deleteTimeoutInMs }
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

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
