import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { EnumActivityLogAction, Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationFilterUtil } from '@common/pagination/utils/pagination.filter.util';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { DeviceAdminListRequestDto } from '@modules/device/dtos/request/device.admin-list.request.dto';
import type { DeviceSharedListRequestDto } from '@modules/device/dtos/request/device.shared-list.request.dto';
import type { DeviceRefreshRequestDto } from '@modules/device/dtos/request/device.refresh.request.dto';
import type {
    IDeviceOwnershipDetail,
    IDeviceRemoveResult,
} from '@modules/device/interfaces/device.interface';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import {
    DeviceCursorAvailableOrderBy,
    DeviceDefaultAvailableOrderBy,
    DeviceSharedListCursorScope,
} from '@modules/device/constants/device.list.constant';

@Injectable()
export class DeviceHttpService {
    constructor(
        private readonly deviceDomain: DeviceDomain,
        private readonly sessionDomain: SessionDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly roleDomain: RoleDomain,
        private readonly sessionQueue: SessionQueue,
        private readonly deviceUtil: DeviceUtil,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly paginationFilterUtil: PaginationFilterUtil,
        private readonly requestStoreService: RequestStoreService,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    private async removeRevokedBy(
        userId: string,
        deviceOwnershipId: string,
        removedBy: string
    ): Promise<IDeviceRemoveResult> {
        const now = this.helperDateService.create();

        try {
            return await this.databaseService.withTransaction(async tx => {
                const revokedSessions =
                    await this.sessionDomain.revokeByDeviceOwnershipInTx(
                        tx,
                        userId,
                        deviceOwnershipId,
                        removedBy,
                        now
                    );
                const deviceOwnership =
                    await this.deviceDomain.removeOwnershipInTx(
                        tx,
                        userId,
                        deviceOwnershipId,
                        removedBy,
                        now
                    );

                return { deviceOwnership, revokedSessions };
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new DeviceNotFoundException();
            }

            throw new AppUnknownException(err);
        }
    }

    async getListOffsetByAdmin(
        userId: string,
        query: DeviceAdminListRequestDto
    ): Promise<IResponsePaginationReturn<IDeviceOwnershipDetail>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.DeviceOwnershipWhereInput>(
                query,
                { availableOrderBy: DeviceDefaultAvailableOrderBy }
            );
        const isRevoked = this.paginationFilterUtil.equalBoolean(
            Prisma.DeviceOwnershipScalarFieldEnum.isRevoked,
            query.isRevoked
        );
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...(isRevoked?.storeFilter ?? {}),
            },
        });

        const { data, ...others } =
            await this.deviceDomain.getListOffsetByAdmin(
                userId,
                params,
                isRevoked?.where
            );
        const deviceOwnerships: IDeviceOwnershipDetail[] = data.map(
            deviceOwnership => ({
                ...deviceOwnership,
                activeSessionCount: deviceOwnership._count.sessions,
                isCurrentDevice: false,
            })
        );

        return {
            data: deviceOwnerships,
            ...others,
        };
    }

    async getListCursor(
        userId: string,
        sessionId: string,
        query: DeviceSharedListRequestDto
    ): Promise<IResponsePaginationReturn<IDeviceOwnershipDetail>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.DeviceOwnershipWhereInput>(
                query,
                {
                    scope: DeviceSharedListCursorScope,
                    availableOrderBy: DeviceCursorAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } = await this.deviceDomain.getListCursor(
            userId,
            sessionId,
            params
        );
        const deviceOwnerships: IDeviceOwnershipDetail[] = data.map(
            deviceOwnership => ({
                ...deviceOwnership,
                activeSessionCount: deviceOwnership._count.sessions,
                isCurrentDevice: deviceOwnership.sessions.length > 0,
            })
        );

        return {
            data: deviceOwnerships,
            ...others,
        };
    }

    async refresh(
        userId: string,
        deviceOwnershipId: string,
        body: DeviceRefreshRequestDto
    ): Promise<IResponseReturn<void>> {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userDeviceRefresh,
            }),
        ];

        await this.deviceDomain.refresh(userId, deviceOwnershipId, {
            name: body.name ?? null,
            platform: body.platform ?? null,
            notificationToken: body.notificationToken ?? null,
        });

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async remove(
        userId: string,
        deviceOwnershipId: string
    ): Promise<IResponseReturn<void>> {
        const { deviceOwnership, revokedSessions } = await this.removeRevokedBy(
            userId,
            deviceOwnershipId,
            userId
        );

        const metadata = this.deviceUtil.mapActivityLogMetadata(
            deviceOwnership,
            revokedSessions.length
        );
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userRemoveDevice,
                userId,
                createdBy: userId,
                metadata,
            }),
        ];

        await this.sessionQueue.purgeLogins(userId, revokedSessions);

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }

    async removeByAdmin(
        userId: string,
        deviceOwnershipId: string,
        user: IUser
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: gate before the work it guards
        const targetRole = await this.roleDomain.getOneByUserId(userId);
        this.roleDomain.assertActorOutranks(user.role.type, targetRole.type);

        const { deviceOwnership, revokedSessions } = await this.removeRevokedBy(
            userId,
            deviceOwnershipId,
            user.id
        );

        const actorMetadata = this.deviceUtil.mapActivityLogActorMetadata(
            deviceOwnership,
            revokedSessions.length
        );
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminDeviceRemove,
                metadata: actorMetadata,
            }),
        ];
        if (userId !== user.id) {
            const targetMetadata = this.deviceUtil.mapActivityLogTargetMetadata(
                deviceOwnership,
                user.id,
                revokedSessions.length
            );
            const targetActivityLog = this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userRemoveDeviceByAdmin,
                userId,
                createdBy: user.id,
                metadata: targetMetadata,
            });
            activityLogs.push(targetActivityLog);
        }

        await this.sessionQueue.purgeLogins(userId, revokedSessions);

        this.activityLogDomain.stagePrepared(activityLogs);

        return {};
    }
}
