import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class WorkspaceLeaveUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, IAuthJwtAccessContext, IWorkspaceContext],
    IResponseReturn<void>
> {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly projectMemberService: ProjectMemberService,
        private readonly userService: UserService,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext
    ): Promise<IResponseReturn<void>> {
        const workspaceId = workspaceContext.workspace.id;
        const member = workspaceContext.workspaceMember;
        this.workspaceMemberService.assertLeavable(member);

        try {
            await this.databaseService.withTransaction(async tx => {
                // Sequential by design: a statement whose failure is the answer, awaited before an unrelated write
                await this.workspaceMemberService.leaveWorkspaceInTx(
                    tx,
                    member
                );
                await Promise.all([
                    this.projectMemberService.removeByWorkspaceAndUserInTx(
                        tx,
                        workspaceId,
                        member.userId
                    ),
                    this.userService.clearLastWorkspaceInTx(
                        tx,
                        member.userId,
                        workspaceId
                    ),
                ]);
                const entry = this.activityLogQueue.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    {
                        action: EnumActivityLogAction.workspaceMemberLeft,
                        userId: member.userId,
                        createdBy: member.userId,
                        workspaceId,
                    }
                );
                await this.outboxService.addInTx(tx, entry);
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceMemberNotFoundException();
            }

            throw new AppUnknownException(err);
        }

        return {};
    }
}
