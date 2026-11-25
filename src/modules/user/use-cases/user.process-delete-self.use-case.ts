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
import { DeviceService } from '@modules/device/services/device.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectService } from '@modules/project/services/project.service';
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
    private readonly deleteSelfTimeoutInMs: number;

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
        private readonly projectMemberService: ProjectMemberService,
        private readonly projectService: ProjectService,
        private readonly sessionService: SessionService,
        private readonly deviceService: DeviceService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService
    ) {
        this.deleteSelfTimeoutInMs = this.configService.get<number>(
            'user.deleteSelfTimeoutInMs'
        )!;
    }

    private async softDeleteProjects(
        workspaceIds: string[],
        now: Date,
        userId: string
    ): Promise<void> {
        if (workspaceIds.length === 0) {
            return;
        }

        let chunk: number;
        // Sequential by design: a fan-out over an unbounded collection: bounded chunks in turn, each concurrent
        do {
            chunk = await this.projectService.softDeleteChunkByWorkspaces(
                workspaceIds,
                now,
                userId
            );
        } while (chunk > 0);
    }

    async execute({
        userId,
        ownedWorkspaceIds,
        activityLog,
    }: IUserDeleteSelfPayload): Promise<IQueueResponse> {
        const message = this.messageService.setMessage('user.queue.deleteSelf');
        const now = this.helperDateService.now();
        const user = await this.userService.getOneLive(userId);
        try {
            if (user !== null) {
                await this.databaseService.withTransaction(
                    async tx => {
                        const [ownedIds] = await Promise.all([
                            this.workspaceService.softDeleteManyInTx(
                                tx,
                                ownedWorkspaceIds,
                                now,
                                userId
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
                            this.projectMemberService.removeByUserInTx(
                                tx,
                                userId
                            ),
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
                            this.sessionService.revokeActiveByUserInTx(
                                tx,
                                userId,
                                userId,
                                now
                            ),
                            this.deviceService.revokeAllByUserInTx(
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
                                {
                                    action: EnumActivityLogAction.userSelfDeleted,
                                }
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
                        await this.outboxService.addManyInTx(tx, [
                            revokeAllEntry,
                            deleteSelfEntry,
                            ...workspaceEntries,
                        ]);
                    },
                    { timeout: this.deleteSelfTimeoutInMs }
                );
            }

            await this.softDeleteProjects(ownedWorkspaceIds, now, userId);
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
