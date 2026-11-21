import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { ProjectQueue } from '@modules/project/queues/project.queue';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { SessionService } from '@modules/session/services/session.service';
import type { IUserDeleteSelfPayload } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { UserService } from '@modules/user/services/user.service';
import { UserSocialService } from '@modules/user/services/user.social.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserProcessDeleteSelfUseCase implements IAppUseCase<
    [IUserDeleteSelfPayload],
    IQueueResponse
> {
    private readonly timeoutInMs: number;

    constructor(
        private readonly userService: UserService,
        private readonly userMobileNumberService: UserMobileNumberService,
        private readonly userSocialService: UserSocialService,
        private readonly userProfileService: UserProfileService,
        private readonly mfaService: MfaService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly workspaceService: WorkspaceService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly projectQueue: ProjectQueue,
        private readonly projectMemberService: ProjectMemberService,
        private readonly sessionService: SessionService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService
    ) {
        this.timeoutInMs = this.configService.get<number>(
            'user.deleteSelf.timeoutInMs'
        )!;
    }

    async execute({
        userId,
        ownedWorkspaceIds,
        activityLog,
    }: IUserDeleteSelfPayload): Promise<IQueueResponse> {
        const message = this.messageService.setMessage('user.queue.deleteSelf');
        const user = await this.userService.getOneLive(userId);
        if (user === null) {
            return { message };
        }

        const now = this.helperDateService.create();
        try {
            await this.databaseService.withTransaction(
                async tx => {
                    const [ownedIds] = await Promise.all([
                        this.workspaceService.softDeleteOwnedByUserInTx(
                            tx,
                            ownedWorkspaceIds,
                            userId,
                            now
                        ),
                        this.workspaceJoinRequestService.cancelPendingByRequesterInTx(
                            tx,
                            userId,
                            userId
                        ),
                        this.workspaceInviteService.revokeAllPendingByEmailInTx(
                            tx,
                            user.email,
                            userId
                        ),
                        this.workspaceMemberService.removeByUserInTx(
                            tx,
                            userId
                        ),
                        this.projectMemberService.removeByUserInTx(tx, userId),
                        this.userMobileNumberService.removeByUserInTx(
                            tx,
                            userId
                        ),
                        this.userSocialService.removeByUserInTx(tx, userId),
                        this.mfaService.deleteByUserInTx(tx, userId),
                        this.passwordHistoryService.removeByUserInTx(
                            tx,
                            userId
                        ),
                        this.sessionService.revokeAllByUserInTx(
                            tx,
                            userId,
                            userId,
                            now
                        ),
                        this.userService.deleteSelfInTx(tx, userId, now),
                        this.userProfileService.deleteOwnedPhotoInTx(
                            tx,
                            userId,
                            user.photo
                        ),
                    ]);

                    const revokeAllEntry =
                        this.activityLogQueue.recordEffectFromPayload(
                            activityLog,
                            {
                                action: EnumActivityLogAction.userAllSessionsRevoked,
                                userId,
                                createdBy: userId,
                            }
                        );
                    const deleteSelfEntry =
                        this.activityLogQueue.recordEffectFromPayload(
                            activityLog,
                            { action: EnumActivityLogAction.userSelfDeleted }
                        );
                    const workspaceEntries = ownedIds.map(workspaceId =>
                        this.activityLogQueue.recordEffectFromPayload(
                            activityLog,
                            {
                                action: EnumActivityLogAction.workspaceDeleted,
                                userId,
                                createdBy: userId,
                                workspaceId,
                            }
                        )
                    );
                    const projectEffects = ownedIds.map(workspaceId =>
                        this.projectQueue.softDeleteByWorkspaceEffect(
                            workspaceId,
                            now,
                            userId
                        )
                    );
                    await this.outboxService.addManyInTx(tx, [
                        revokeAllEntry,
                        deleteSelfEntry,
                        ...workspaceEntries,
                        ...projectEffects,
                    ]);
                },
                { timeout: this.timeoutInMs }
            );
        } catch (error: unknown) {
            if (
                error instanceof AppBaseException ||
                error instanceof QueueException
            ) {
                throw error;
            }

            const failure = this.messageService.setMessage(
                'user.queue.error.deleteSelfFailed'
            );

            throw new QueueException(failure, true, error);
        }

        return { message };
    }
}
