import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
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
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
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
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserHttpService {
    private readonly deleteSelfTimeoutInMs: number;

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
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService,
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
            await this.userPasswordDomain.countPasswordAttempt(user);
        if (attempt === null) {
            return;
        }

        const lockoutLogs = attempt.lockoutStages.map(stage =>
            this.activityLogDomain.prepare(stage)
        );
        this.activityLogDomain.stagePrepared(lockoutLogs);

        await this.userAuthDomain.assertPasswordAttempt(attempt, password);
    }

    private async cascadeDeletedWorkspacesInTx(
        tx: IDatabaseTransactionClient,
        workspaceIds: string[],
        userId: string,
        now: Date
    ): Promise<void> {
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
    }

    async getListOffsetByAdmin(
        query: UserListRequestDto
    ): Promise<IResponsePaginationReturn<IUserList>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.UserWhereInput>(query, {
                availableSearch: UserDefaultAvailableSearch,
                availableOrderBy: UserDefaultAvailableOrderBy,
            });
        const status = this.paginationFilterUtil.inEnum(
            Prisma.UserScalarFieldEnum.status,
            query.status,
            UserDefaultStatus
        );
        const roleId = this.paginationFilterUtil.equalString(
            Prisma.UserScalarFieldEnum.roleId,
            query.roleId
        );
        const countryId = this.paginationFilterUtil.equalString(
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
        this.userDomain.assertSelfDeletable(user);

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
        await this.assertPasswordMatched(user, password ?? null);

        const now = this.helperDateService.create();
        let deleted: User;
        let revoked: ISessionRef[];
        let workspaceIds: string[];
        try {
            ({ deleted, revoked, workspaceIds } =
                await this.databaseService.withTransaction(
                    async tx => {
                        await this.workspaceDomain.assertOwnedHasNoOtherMembersInTx(
                            tx,
                            userId
                        );
                        const ownedIds =
                            await this.workspaceDomain.softDeleteOwnedByUserInTx(
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
                        await this.workspaceJoinRequestDomain.cancelPendingByRequesterInTx(
                            tx,
                            userId
                        );
                        await this.workspaceInviteDomain.revokeAllPendingByEmailInTx(
                            tx,
                            user.email
                        );
                        await this.workspaceMemberDomain.removeByUserInTx(
                            tx,
                            userId
                        );
                        await this.projectMemberDomain.removeByUserInTx(
                            tx,
                            userId
                        );
                        await this.userMobileNumberDomain.removeByUserInTx(
                            tx,
                            userId
                        );
                        await this.userTwoFactorDomain.removeInTx(tx, userId);
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
                        const row = await this.userDomain.deleteSelfInTx(
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
            this.userProfileDomain.deleteOwnedPhoto(userId, deleted.photo),
        ]);

        const workspaceActivityLogs = workspaceIds.map(workspaceId =>
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.workspaceDeleted,
                userId,
                createdBy: userId,
                workspaceId,
            })
        );
        this.activityLogDomain.stagePrepared([
            ...activityLogs,
            ...workspaceActivityLogs,
        ]);

        return {};
    }
}
