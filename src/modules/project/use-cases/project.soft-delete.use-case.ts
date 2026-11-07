import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { ProjectService } from '@modules/project/services/project.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ProjectSoftDeleteUseCase implements IAppUseCase<
    [Project, string],
    IResponseReturn<void>
> {
    constructor(
        private readonly projectService: ProjectService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly activityLogService: ActivityLogService,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        project: Project,
        actorId: string
    ): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.projectDeleted,
                userId: actorId,
                createdBy: actorId,
                workspaceId: project.workspaceId,
            }),
        ];

        const deletedAt = this.helperDateService.create();
        try {
            await this.databaseService.withTransaction(async tx => {
                await this.projectService.softDeleteProjectInTx(
                    tx,
                    project,
                    deletedAt,
                    actorId
                );
                await this.workspaceInviteService.clearProjectInTx(
                    tx,
                    project.id
                );
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new ProjectNotFoundException();
            }

            throw new AppUnknownException(err);
        }

        this.activityLogService.stagePrepared(activityLogs);

        return {};
    }
}
