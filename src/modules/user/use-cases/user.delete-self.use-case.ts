import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { DeviceService } from '@modules/device/services/device.service';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { SessionService } from '@modules/session/services/session.service';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserDeleteSelfRequestDto } from '@modules/user/dtos/request/user.delete-self.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserService } from '@modules/user/services/user.service';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserDeleteSelfUseCase implements IAppUseCase<
    [IUser, UserDeleteSelfRequestDto],
    IResponseReturn<void>
> {
    private readonly deleteSelfTimeoutInMs: number;

    constructor(
        private readonly userService: UserService,
        private readonly userAuthService: UserAuthService,
        private readonly userPasswordService: UserPasswordService,
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly userMobileNumberService: UserMobileNumberService,
        private readonly workspaceService: WorkspaceService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly workspaceJoinRequestService: WorkspaceJoinRequestService,
        private readonly projectService: ProjectService,
        private readonly projectMemberService: ProjectMemberService,
        private readonly sessionService: SessionService,
        private readonly deviceService: DeviceService,
        private readonly activityLogService: ActivityLogService,
        private readonly sessionQueue: SessionQueue,
        private readonly userProfileService: UserProfileService,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.deleteSelfTimeoutInMs = this.configService.get<number>(
            'user.deleteSelf.timeoutInMs'
        )!;
    }

    private async assertPasswordMatched(
        user: IUser,
        password: string | null
    ): Promise<void> {
        const attempt =
            await this.userPasswordService.countPasswordAttempt(user);
        if (attempt === null) {
            return;
        }

        const lockoutLogs = attempt.lockoutStages.map(stage =>
            this.activityLogService.prepare(stage)
        );
        this.activityLogService.stagePrepared(lockoutLogs);

        await this.userAuthService.assertPasswordAttempt(attempt, password);
    }

    private async cascadeDeletedWorkspacesInTx(
        tx: IDatabaseTransactionClient,
        workspaceIds: string[],
        userId: string,
        now: Date
    ): Promise<void> {
        for (const workspaceId of workspaceIds) {
            await this.projectService.softDeleteByWorkspaceInTx(
                tx,
                workspaceId,
                now,
                userId
            );
            await this.workspaceInviteService.revokePendingByWorkspaceInTx(
                tx,
                workspaceId
            );
            await this.workspaceJoinRequestService.cancelPendingByWorkspaceInTx(
                tx,
                workspaceId
            );
        }
    }

    async execute(
        user: IUser,
        { password }: UserDeleteSelfRequestDto
    ): Promise<IResponseReturn<void>> {
        this.userService.assertSelfDeletable(user);

        const userId = user.id;
        const activityLogs = [
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId,
                createdBy: userId,
            }),
            this.activityLogService.prepare({
                action: EnumActivityLogAction.userDeleteSelf,
            }),
        ];

        // Sequential by design: gate before the work it guards
        await this.assertPasswordMatched(user, password ?? null);

        const now = this.helperDateService.create();
        let deleted: User;
        let revoked: ISessionRef[];
        let workspaceIds: string[];
        try {
            ({ deleted, revoked, workspaceIds } =
                await this.databaseService.withTransaction(
                    async tx => {
                        await this.workspaceService.assertOwnedHasNoOtherMembersInTx(
                            tx,
                            userId
                        );
                        const ownedIds =
                            await this.workspaceService.softDeleteOwnedByUserInTx(
                                tx,
                                userId,
                                now
                            );
                        await this.cascadeDeletedWorkspacesInTx(
                            tx,
                            ownedIds,
                            userId,
                            now
                        );
                        await this.workspaceJoinRequestService.cancelPendingByRequesterInTx(
                            tx,
                            userId
                        );
                        await this.workspaceInviteService.revokeAllPendingByEmailInTx(
                            tx,
                            user.email
                        );
                        await this.workspaceMemberService.removeByUserInTx(
                            tx,
                            userId
                        );
                        await this.projectMemberService.removeByUserInTx(
                            tx,
                            userId
                        );
                        await this.userMobileNumberService.removeByUserInTx(
                            tx,
                            userId
                        );
                        await this.userTwoFactorService.removeInTx(tx, userId);
                        const sessions =
                            await this.sessionService.revokeActiveByUserInTx(
                                tx,
                                userId,
                                userId,
                                now
                            );
                        await this.deviceService.revokeAllByUserInTx(
                            tx,
                            userId,
                            userId,
                            now
                        );
                        const row = await this.userService.deleteSelfInTx(
                            tx,
                            user,
                            now
                        );

                        return {
                            deleted: row,
                            revoked: sessions,
                            workspaceIds: ownedIds,
                        };
                    },
                    { timeout: this.deleteSelfTimeoutInMs }
                ));
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new UserNotFoundException();
            }

            throw new AppUnknownException(err);
        }

        await Promise.all([
            this.sessionQueue.purgeLogins(userId, revoked),
            this.userProfileService.deleteOwnedPhoto(userId, deleted.photo),
        ]);

        const workspaceActivityLogs = workspaceIds.map(workspaceId =>
            this.activityLogService.prepare({
                action: EnumActivityLogAction.workspaceDeleted,
                userId,
                createdBy: userId,
                workspaceId,
            })
        );
        this.activityLogService.stagePrepared([
            ...activityLogs,
            ...workspaceActivityLogs,
        ]);

        return {};
    }
}
