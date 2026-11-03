import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    UserDefaultAvailableOrderBy,
    UserDefaultAvailableSearch,
    UserDefaultStatus,
} from '@modules/user/constants/user.list.constant';
import type { UserListRequestDto } from '@modules/user/dtos/request/user.list.request.dto';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { SessionUtil } from '@modules/session/utils/session.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceJoinRequestDomain } from '@modules/workspace/domains/workspace.join-request.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserMobileNumberDomain } from '@modules/user/domains/user.mobile-number.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserStatusInvalidException } from '@modules/user/exceptions/user.status-invalid.exception';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import type { UserDeleteSelfRequestDto } from '@modules/user/dtos/request/user.delete-self.request.dto';
import type { UserCheckEmailRequestDto } from '@modules/user/dtos/request/user.check-email.request.dto';
import type { UserCheckUsernameRequestDto } from '@modules/user/dtos/request/user.check-username.request.dto';
import type { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import type {
    IUser,
    IUserCheckEmail,
    IUserCheckUsername,
    IUserList,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserProfileDomain } from '@modules/user/domains/user.profile.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserHttpService {
    constructor(
        private readonly userDomain: UserDomain,
        private readonly userAuthDomain: UserAuthDomain,
        private readonly userPasswordDomain: UserPasswordDomain,
        private readonly userTwoFactorDomain: UserTwoFactorDomain,
        private readonly userMobileNumberDomain: UserMobileNumberDomain,
        private readonly workspaceDomain: WorkspaceDomain,
        private readonly workspaceMemberDomain: WorkspaceMemberDomain,
        private readonly workspaceInviteDomain: WorkspaceInviteDomain,
        private readonly workspaceJoinRequestDomain: WorkspaceJoinRequestDomain,
        private readonly projectDomain: ProjectDomain,
        private readonly projectMemberDomain: ProjectMemberDomain,
        private readonly roleDomain: RoleDomain,
        private readonly sessionDomain: SessionDomain,
        private readonly deviceDomain: DeviceDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly sessionQueue: SessionQueue,
        private readonly sessionUtil: SessionUtil,
        private readonly userProfileDomain: UserProfileDomain,
        private readonly userUtil: UserUtil,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    /** Deactivates the user that spent its attempt budget and revokes its sessions and devices on one transaction; answers the revoked sessions, or null when the account was already deactivated or the write conflicted. */
    private async reachMaxAttempt(
        userId: string
    ): Promise<ISessionRef[] | null> {
        const now = this.helperDateService.create();

        try {
            return await this.databaseService.withTransaction(async tx => {
                const isDeactivated =
                    await this.userDomain.deactivateForMaxAttemptInTx(
                        tx,
                        userId
                    );
                if (!isDeactivated) {
                    return null;
                }

                const sessions =
                    await this.sessionDomain.revokeActiveByUserInTx(
                        tx,
                        userId,
                        userId,
                        now
                    );
                await this.deviceDomain.revokeAllByUserInTx(
                    tx,
                    userId,
                    userId,
                    now
                );

                return sessions;
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                return null;
            }

            throw new AppUnknownException(err);
        }
    }

    /** Counts one password attempt, locks the account out when the budget is spent, and checks the current password of a user that has one. */
    private async assertPasswordMatched(
        user: IUser,
        password: string
    ): Promise<void> {
        const hasPassword = this.userUtil.hasPassword(user);
        if (!hasPassword) {
            return;
        }

        const isAttemptCounted =
            await this.userPasswordDomain.incrementPasswordAttempt(user.id);
        if (!isAttemptCounted) {
            const lockoutLogs = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userRevokeAllSessions,
                    userId: user.id,
                    createdBy: user.id,
                }),
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                    userId: user.id,
                    createdBy: user.id,
                }),
            ];
            const revoked = await this.reachMaxAttempt(user.id);
            if (revoked !== null) {
                await this.sessionQueue.purgeLogins(user.id, revoked);

                this.activityLogDomain.stagePrepared(lockoutLogs);
            }
        }

        this.userPasswordDomain.assertAttemptCounted(isAttemptCounted);
        // Sequential by design: the attempt resets only after the password matches
        const isMatch = await this.userAuthDomain.verifyCredential(
            {
                user,
                hashedPassword: user.password,
                isAttemptCounted,
            },
            password
        );
        this.userAuthDomain.assertPasswordMatched(isMatch);
    }

    async getListOffsetByAdmin(
        query: UserListRequestDto
    ): Promise<IResponsePaginationReturn<IUserList>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.UserWhereInput>(query, {
                availableSearch: UserDefaultAvailableSearch,
                availableOrderBy: UserDefaultAvailableOrderBy,
            });
        const status = this.paginationQueryUtil.inEnum(
            Prisma.UserScalarFieldEnum.status,
            query.status,
            UserDefaultStatus
        );
        const roleId = this.paginationQueryUtil.equalString(
            Prisma.UserScalarFieldEnum.roleId,
            query.roleId
        );
        const countryId = this.paginationQueryUtil.equalString(
            Prisma.UserScalarFieldEnum.countryId,
            query.countryId
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(status?.storeFilter ?? {}),
                ...(roleId?.storeFilter ?? {}),
                ...(countryId?.storeFilter ?? {}),
            },
        });

        return this.userDomain.getListOffsetByAdmin(
            params,
            status?.where,
            roleId?.where,
            countryId?.where
        );
    }

    async getOne(id: string): Promise<IResponseReturn<IUserProfile>> {
        const user = await this.userDomain.getOne(id);

        return { data: user };
    }

    async updateStatusByAdmin(
        userId: string,
        { status }: UserUpdateStatusRequestDto,
        user: IUser
    ): Promise<IResponseReturn<void>> {
        this.userDomain.assertNotSelf(userId, user.id);

        // Sequential by design: gate before the work it guards
        const target = await this.userDomain.getOneWithRole(userId);
        this.roleDomain.assertActorOutranks(user.role.type, target.role.type);
        this.userDomain.assertUnblocked(target);

        const now = this.helperDateService.create();
        const revokesSessions = this.userUtil.revokesSessionsOn(status);
        let row: User;
        let revoked: ISessionRef[] | null;
        try {
            ({ row, revoked } = await this.databaseService.withTransaction(
                async tx => {
                    const updated =
                        await this.userDomain.updateStatusByAdminInTx(
                            tx,
                            target,
                            status
                        );
                    if (!revokesSessions) {
                        return { row: updated, revoked: null };
                    }

                    const sessions =
                        await this.sessionDomain.revokeActiveByUserInTx(
                            tx,
                            userId,
                            user.id,
                            now
                        );

                    return { row: updated, revoked: sessions };
                }
            ));
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new UserStatusInvalidException();
            }

            throw new AppUnknownException(err);
        }

        const action = this.userUtil.resolveStatusActivityLogAction(status);
        const actorMetadata = this.userUtil.mapActivityLogActorMetadata(row);
        const targetMetadata = this.userUtil.mapActivityLogTargetMetadata(
            row,
            user.id
        );
        const statusActivityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminUserUpdateStatus,
                metadata: actorMetadata,
            }),
            this.activityLogDomain.prepare({
                action,
                userId,
                createdBy: user.id,
                metadata: targetMetadata,
            }),
        ];
        if (revoked !== null) {
            await this.sessionQueue.purgeLogins(userId, revoked);

            if (revoked.length > 0) {
                const revokeAllActorMetadata =
                    this.sessionUtil.mapActivityLogRevokeAllActorMetadata(
                        userId,
                        revoked.length
                    );
                const revokeAllTargetMetadata =
                    this.sessionUtil.mapActivityLogRevokeAllTargetMetadata(
                        user.id,
                        revoked.length
                    );
                const revokeAllActivityLogs = [
                    this.activityLogDomain.prepare({
                        action: EnumActivityLogAction.adminSessionRevokeAll,
                        metadata: revokeAllActorMetadata,
                    }),
                    this.activityLogDomain.prepare({
                        action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                        userId,
                        createdBy: user.id,
                        metadata: revokeAllTargetMetadata,
                    }),
                ];
                this.activityLogDomain.stagePrepared(revokeAllActivityLogs);
            }
        }

        this.activityLogDomain.stagePrepared(statusActivityLogs);

        return {};
    }

    async checkUsername({
        username,
    }: UserCheckUsernameRequestDto): Promise<
        IResponseReturn<IUserCheckUsername>
    > {
        const checkUsername = await this.userDomain.checkUsername(username);

        return { data: checkUsername };
    }

    async checkEmail({
        email,
    }: UserCheckEmailRequestDto): Promise<IResponseReturn<IUserCheckEmail>> {
        const checkEmail = await this.userDomain.checkEmail(email);

        return { data: checkEmail };
    }

    async deleteSelf(
        user: IUser,
        { password }: UserDeleteSelfRequestDto
    ): Promise<IResponseReturn<void>> {
        const userId = user.id;
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId,
                createdBy: userId,
            }),
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userDeleteSelf,
            }),
        ];

        // Sequential by design: gate before the work it guards
        await this.assertPasswordMatched(user, password);

        const now = this.helperDateService.create();
        const { deleted, revoked } = await this.databaseService.withTransaction(
            async tx => {
                const workspaceIds =
                    await this.workspaceDomain.softDeleteSolelyOwnedByUserInTx(
                        tx,
                        userId,
                        now
                    );
                for (const workspaceId of workspaceIds) {
                    await this.projectDomain.softDeleteByWorkspaceInTx(
                        tx,
                        workspaceId,
                        now,
                        userId
                    );
                    await this.workspaceInviteDomain.revokePendingByWorkspaceInTx(
                        tx,
                        workspaceId
                    );
                    await this.workspaceJoinRequestDomain.cancelPendingByWorkspaceInTx(
                        tx,
                        workspaceId
                    );
                }

                await this.workspaceMemberDomain.removeByUserInTx(tx, userId);
                await this.projectMemberDomain.removeByUserInTx(tx, userId);
                await this.userMobileNumberDomain.removeByUserInTx(tx, userId);
                await this.userTwoFactorDomain.removeInTx(tx, userId);
                const revoked = await this.sessionDomain.revokeActiveByUserInTx(
                    tx,
                    userId,
                    userId,
                    now
                );
                await this.deviceDomain.revokeAllByUserInTx(
                    tx,
                    userId,
                    userId,
                    now
                );
                const deleted = await this.userDomain.deleteSelfInTx(
                    tx,
                    userId,
                    now
                );

                return { deleted, revoked };
            }
        );

        await Promise.all([
            this.sessionQueue.purgeLogins(userId, revoked),
            this.userProfileDomain.deleteOwnedPhoto(userId, deleted.photo),
        ]);

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }
}
