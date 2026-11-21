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
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class WorkspaceRemoveMemberUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IWorkspaceContext,
        string,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly projectMemberService: ProjectMemberService,
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly userService: UserService,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        workspaceContext: IWorkspaceContext,
        targetMemberId: string
    ): Promise<IResponseReturn<void>> {
        const workspaceId = workspaceContext.workspace.id;
        const actorMember = workspaceContext.workspaceMember;
        const removed = await this.workspaceMemberService.getPeerTarget(
            workspaceId,
            actorMember,
            targetMemberId
        );

        try {
            await this.databaseService.withTransaction(async tx => {
                // Sequential by design: a statement whose failure is the answer, awaited before an unrelated write
                await this.workspaceMemberService.removeMemberInTx(tx, removed);
                await Promise.all([
                    this.projectMemberService.removeByWorkspaceAndUserInTx(
                        tx,
                        workspaceId,
                        removed.userId
                    ),
                    this.workspaceInviteService.revokePendingByEmailInTx(
                        tx,
                        workspaceId,
                        removed.user.email
                    ),
                    this.workspaceJoinRequestService.cancelPendingByUserInTx(
                        tx,
                        workspaceId,
                        removed.userId
                    ),
                    this.userService.clearLastWorkspaceInTx(
                        tx,
                        removed.userId,
                        workspaceId
                    ),
                ]);
                const actorEntry = this.activityLogQueue.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    {
                        action: EnumActivityLogAction.workspaceMemberRemoved,
                        userId: actorMember.userId,
                        createdBy: actorMember.userId,
                        workspaceId,
                        metadata: { targetUserId: removed.userId },
                    }
                );
                const targetEntry = this.activityLogQueue.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    {
                        action: EnumActivityLogAction.workspaceMemberRemovedByAdmin,
                        userId: removed.userId,
                        createdBy: actorMember.userId,
                        workspaceId,
                        metadata: { actorUserId: actorMember.userId },
                    }
                );
                await this.outboxService.addManyInTx(tx, [
                    actorEntry,
                    targetEntry,
                ]);
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceMemberPeerForbiddenException();
            }

            throw new AppUnknownException(err);
        }

        return {};
    }
}
