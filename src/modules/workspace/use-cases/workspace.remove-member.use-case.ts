import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { UserService } from '@modules/user/services/user.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
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
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly userService: UserService,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService
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
        const target = await this.workspaceMemberService.getPeerTarget(
            authContext,
            workspaceId,
            actorMember,
            targetMemberId
        );

        await this.databaseService.withTransaction(async tx => {
            // Sequential by design: a statement whose failure is the answer, awaited before an unrelated write
            const removed = await this.workspaceMemberService.removeMemberInTx(
                tx,
                target
            );
            await Promise.all([
                this.projectMemberService.removeByWorkspaceAndUserInTx(
                    tx,
                    removed.workspaceId,
                    removed.userId
                ),
                this.workspaceInviteService.revokePendingByEmailInTx(
                    tx,
                    removed.workspaceId,
                    removed.user.email
                ),
                this.userService.clearLastWorkspaceInTx(
                    tx,
                    removed.userId,
                    removed.workspaceId
                ),
            ]);
            const actorEntry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.workspaceMemberRemoved,
                    userId: authContext.userId,
                    createdBy: authContext.userId,
                    workspaceId: removed.workspaceId,
                    metadata: { targetUserId: removed.userId },
                }
            );
            const targetEntry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.workspaceMemberRemovedByAdmin,
                    userId: removed.userId,
                    createdBy: authContext.userId,
                    workspaceId: removed.workspaceId,
                    metadata: { actorUserId: authContext.userId },
                }
            );
            await this.outboxService.addManyInTx(tx, [actorEntry, targetEntry]);
        });

        return {};
    }
}
