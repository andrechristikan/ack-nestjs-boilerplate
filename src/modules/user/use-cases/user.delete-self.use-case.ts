import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { SessionService } from '@modules/session/services/session.service';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceJoinRequestService } from '@modules/workspace/services/workspace.join-request.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import type { UserDeleteSelfRequestDto } from '@modules/user/dtos/request/user.delete-self.request.dto';
import { UserService } from '@modules/user/services/user.service';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';

@Injectable()
export class UserDeleteSelfUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        UserDeleteSelfRequestDto,
    ],
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
        private readonly activityLogService: ActivityLogService,
        private readonly userProfileService: UserProfileService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.deleteSelfTimeoutInMs = this.configService.get<number>(
            'user.deleteSelf.timeoutInMs'
        )!;
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
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        { password }: UserDeleteSelfRequestDto
    ): Promise<IResponseReturn<void>> {
        const { user } = userContext;
        this.userService.assertSelfDeletable(user);

        const userId = authContext.userId;

        // Sequential by design: gate before the work it guards
        await this.userAuthService.assertCurrentPassword(
            requestContext,
            apiKeyContext,
            user,
            password ?? null
        );

        const now = this.helperDateService.create();
        try {
            await this.outboxService.withTransaction(
                async tx => {
                    await this.userPasswordService.resetPasswordAttemptInTx(
                        tx,
                        userId
                    );
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
                    await this.sessionService.revokeAllByUserInTx(
                        tx,
                        userId,
                        userId,
                        now
                    );
                    const deleted = await this.userService.deleteSelfInTx(
                        tx,
                        user,
                        now
                    );
                    await this.userProfileService.deleteOwnedPhotoInTx(
                        tx,
                        userId,
                        deleted.photo
                    );

                    const revokeAllEntry = this.activityLogService.recordEffect(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        null,
                        {
                            action: EnumActivityLogAction.userRevokeAllSessions,
                            userId,
                            createdBy: userId,
                        }
                    );
                    const deleteSelfEntry =
                        this.activityLogService.recordEffect(
                            requestContext,
                            apiKeyContext,
                            authContext,
                            null,
                            {
                                action: EnumActivityLogAction.userDeleteSelf,
                            }
                        );
                    const workspaceEntries = ownedIds.map(workspaceId =>
                        this.activityLogService.recordEffect(
                            requestContext,
                            apiKeyContext,
                            authContext,
                            null,
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

        return {};
    }
}
