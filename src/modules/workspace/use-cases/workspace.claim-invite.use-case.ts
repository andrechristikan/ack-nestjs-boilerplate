import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteClaimRequestDto } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class WorkspaceClaimInviteUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        WorkspaceInviteClaimRequestDto,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly projectMemberService: ProjectMemberService,
        private readonly userService: UserService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        { inviteToken }: WorkspaceInviteClaimRequestDto
    ): Promise<IResponseReturn<void>> {
        const userId = authContext.userId;
        const invite = await this.workspaceInviteService.validateInviteForEmail(
            inviteToken,
            userContext.user.email
        );

        await this.workspaceInviteService.assertInviteeNotMember(
            invite.workspaceId,
            userId
        );

        const acceptedAt = this.helperDateService.now();
        await this.databaseService.withTransaction(async tx => {
            const accepted =
                await this.workspaceInviteService.acceptPendingInTx(
                    tx,
                    invite.id,
                    userId,
                    acceptedAt
                );
            await this.workspaceMemberService.createInTx(
                tx,
                accepted.workspaceId,
                userId,
                accepted.workspaceRole,
                userId
            );
            let membership: Promise<void> = Promise.resolve();
            if (accepted.projectId && accepted.projectRole) {
                membership = this.projectMemberService.createInTx(
                    tx,
                    accepted.projectId,
                    userId,
                    accepted.projectRole,
                    userId
                );
            }
            await Promise.all([
                this.workspaceJoinRequestService.cancelPendingByUserInTx(
                    tx,
                    accepted.workspaceId,
                    userId
                ),
                this.userService.setLastWorkspaceInTx(
                    tx,
                    userId,
                    accepted.workspaceId
                ),
                membership,
            ]);
            const inviteeEntry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    action: EnumActivityLogAction.workspaceInviteAccepted,
                    userId,
                    createdBy: userId,
                    workspaceId: accepted.workspaceId,
                    metadata: { targetUserId: accepted.invitedByUserId },
                }
            );
            const entries = [inviteeEntry];
            if (accepted.invitedByUserId !== userId) {
                const inviterEntry = this.activityLogQueue.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    {
                        action: EnumActivityLogAction.workspaceInviteAcceptedByInvitee,
                        userId: accepted.invitedByUserId,
                        createdBy: userId,
                        workspaceId: accepted.workspaceId,
                        metadata: { actorUserId: userId },
                    }
                );
                entries.push(inviterEntry);
            }
            await this.outboxService.addManyInTx(tx, entries);
        });

        return {};
    }
}
