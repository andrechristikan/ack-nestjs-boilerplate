import { DatabaseService } from '@common/database/services/database.service';
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
import {
    EnumActivityLogAction,
    EnumUserStatus,
    Prisma,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { SessionUtil } from '@modules/session/utils/session.util';
import { UserUtil } from '@modules/user/utils/user.util';
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
        private readonly helperDateService: HelperDateService
    ) {}

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
        const { row, revoked } = await this.databaseService.withTransaction(
            async tx => {
                const row = await this.userDomain.updateStatusByAdminInTx(
                    tx,
                    userId,
                    status,
                    target.passwordAttempt
                );
                if (status === EnumUserStatus.active) {
                    return { row, revoked: null };
                }

                const revoked = await this.sessionDomain.revokeActiveByUserInTx(
                    tx,
                    userId,
                    user.id,
                    now
                );

                return { row, revoked };
            }
        );

        const action =
            status === EnumUserStatus.blocked
                ? EnumActivityLogAction.userBlocked
                : EnumActivityLogAction.userUpdateStatus;
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

    async deleteSelf(userId: string): Promise<IResponseReturn<void>> {
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

        const now = this.helperDateService.create();
        const { deleted, revoked } = await this.databaseService.withTransaction(
            async tx => {
                const deleted = await this.userDomain.deleteSelfInTx(
                    tx,
                    userId,
                    now
                );
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
