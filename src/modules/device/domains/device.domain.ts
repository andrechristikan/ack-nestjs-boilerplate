import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumDeviceNotificationProvider,
    Prisma,
} from '@generated/prisma-client/client';
import type { DeviceOwnership } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import type {
    IDeviceIdentity,
    IDeviceLoginUpsert,
    IDeviceOwnership,
    IDeviceOwnershipWithSession,
    IDeviceRefresh,
} from '@modules/device/interfaces/device.interface';
import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { DeviceRepository } from '@modules/device/repositories/device.repository';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { RoleDomain } from '@modules/role/domains/role.domain';
import type { IRoleActor } from '@modules/role/interfaces/role.interface';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DeviceDomain {
    private readonly logger = new Logger(DeviceDomain.name);

    constructor(
        private readonly deviceOwnershipRepository: DeviceOwnershipRepository,
        private readonly deviceRepository: DeviceRepository,
        private readonly sessionDomain: SessionDomain,
        private readonly deviceUtil: DeviceUtil,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService,
        private readonly roleDomain: RoleDomain
    ) {}

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePaginationReturn<IDeviceOwnership>> {
        return this.deviceOwnershipRepository.findWithPaginationOffsetByAdmin(
            userId,
            pagination,
            isRevoked ?? null
        );
    }

    async getListCursor(
        userId: string,
        sessionId: string,
        pagination: IPaginationQueryCursorParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePaginationReturn<IDeviceOwnershipWithSession>> {
        return this.deviceOwnershipRepository.findActiveWithPaginationCursor(
            userId,
            sessionId,
            pagination
        );
    }

    async getOwnershipsWithNotificationToken(
        userId: string
    ): Promise<DeviceOwnership[]> {
        return this.deviceOwnershipRepository.findTokensByUserId(userId);
    }

    async cleanupNotificationTokens(
        userId: string,
        tokens: string[]
    ): Promise<number> {
        const { count } = await this.deviceOwnershipRepository.clearTokens(
            userId,
            tokens
        );

        return count;
    }

    async cleanupStaleNotificationTokens(
        thresholdInMs: number
    ): Promise<number> {
        const { count } =
            await this.deviceOwnershipRepository.clearStaleTokens(
                thresholdInMs
            );

        return count;
    }

    async upsertForLoginInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        device: IDeviceIdentity,
        notificationProvider: EnumDeviceNotificationProvider | null,
        now: Date
    ): Promise<IDeviceLoginUpsert> {
        const upserted = await this.deviceRepository.upsertByFingerprintInTx(
            tx,
            userId,
            device,
            now
        );
        const { deviceOwnership, isNewOwnership } =
            await this.deviceOwnershipRepository.upsertActiveInTx(
                tx,
                upserted.id,
                userId,
                device.notificationToken,
                notificationProvider,
                now
            );
        if (device.notificationToken !== null) {
            await this.deviceOwnershipRepository.clearTokenFromOtherUsersInTx(
                tx,
                device.notificationToken,
                userId
            );
        }

        return {
            device: upserted,
            deviceOwnership,
            isNewDevice: isNewOwnership,
        };
    }

    async clearNotificationInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        updatedBy: string,
        now: Date
    ): Promise<void> {
        const cleared =
            await this.deviceOwnershipRepository.clearNotificationInTx(
                tx,
                userId,
                deviceOwnershipId,
                updatedBy,
                now
            );
        if (!cleared) {
            this.logger.warn(
                { userId, deviceOwnershipId },
                'No live device to clear the notification token for'
            );
        }
    }

    async revokeAllByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        revokedBy: string,
        now: Date
    ): Promise<void> {
        await this.deviceOwnershipRepository.revokeAllByUserInTx(
            tx,
            userId,
            revokedBy,
            now
        );
    }

    async refresh(
        userId: string,
        deviceOwnershipId: string,
        data: IDeviceRefresh
    ): Promise<void> {
        // Sequential by design: gate before the work it guards
        const deviceOwnershipExists =
            await this.deviceOwnershipRepository.existsActive(
                userId,
                deviceOwnershipId
            );
        if (!deviceOwnershipExists) {
            throw new DeviceNotFoundException();
        }
        const notificationProvider =
            this.deviceUtil.resolveNotificationProvider(data.platform);
        const now = this.helperDateService.create();
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userDeviceRefresh,
            }),
        ];

        try {
            await this.databaseService.withTransaction(async tx => {
                const deviceId =
                    await this.deviceOwnershipRepository.refreshInTx(
                        tx,
                        userId,
                        deviceOwnershipId,
                        data,
                        notificationProvider,
                        now
                    );
                await this.deviceRepository.refreshInTx(
                    tx,
                    deviceId,
                    data,
                    now
                );
                if (data.notificationToken !== null) {
                    await this.deviceOwnershipRepository.clearTokenFromOtherUsersInTx(
                        tx,
                        data.notificationToken,
                        userId
                    );
                }
            });

            this.activityLogDomain.stagePrepared(activityLogs);

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async remove(userId: string, deviceOwnershipId: string): Promise<void> {
        // Sequential by design: gate before the work it guards
        const deviceOwnershipExists =
            await this.deviceOwnershipRepository.existsActive(
                userId,
                deviceOwnershipId
            );
        if (!deviceOwnershipExists) {
            throw new DeviceNotFoundException();
        }
        const now = this.helperDateService.create();

        try {
            const { revokedSessions, activityLogs } =
                await this.databaseService.withTransaction(async tx => {
                    const sessions =
                        await this.sessionDomain.revokeByDeviceOwnershipInTx(
                            tx,
                            userId,
                            deviceOwnershipId,
                            userId,
                            now
                        );
                    const row =
                        await this.deviceOwnershipRepository.removeOwnershipInTx(
                            tx,
                            userId,
                            deviceOwnershipId,
                            userId,
                            now
                        );
                    const metadata = this.deviceUtil.mapActivityLogMetadata(
                        row,
                        sessions.length
                    );
                    const prepared = [
                        this.activityLogDomain.prepare({
                            action: EnumActivityLogAction.userRemoveDevice,
                            userId,
                            createdBy: userId,
                            metadata,
                        }),
                    ];

                    return {
                        revokedSessions: sessions,
                        activityLogs: prepared,
                    };
                });
            await this.sessionDomain.purgeRevokedLogins(
                userId,
                revokedSessions
            );

            this.activityLogDomain.stagePrepared(activityLogs);

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async removeByAdmin(
        userId: string,
        deviceOwnershipId: string,
        removedBy: string,
        actor: IRoleActor
    ): Promise<void> {
        // Sequential by design: gate before the work it guards
        const targetRole = await this.roleDomain.getOneByUserId(userId);
        this.roleDomain.assertActorOutranks(actor.roleType, targetRole.type);
        const deviceOwnershipExists =
            await this.deviceOwnershipRepository.existsActive(
                userId,
                deviceOwnershipId
            );
        if (!deviceOwnershipExists) {
            throw new DeviceNotFoundException();
        }
        const now = this.helperDateService.create();

        try {
            const { revokedSessions, activityLogs } =
                await this.databaseService.withTransaction(async tx => {
                    const sessions =
                        await this.sessionDomain.revokeByDeviceOwnershipInTx(
                            tx,
                            userId,
                            deviceOwnershipId,
                            removedBy,
                            now
                        );
                    const row =
                        await this.deviceOwnershipRepository.removeOwnershipInTx(
                            tx,
                            userId,
                            deviceOwnershipId,
                            removedBy,
                            now
                        );
                    const actorMetadata =
                        this.deviceUtil.mapActivityLogActorMetadata(
                            row,
                            sessions.length
                        );
                    const prepared = [
                        this.activityLogDomain.prepare({
                            action: EnumActivityLogAction.adminDeviceRemove,
                            metadata: actorMetadata,
                        }),
                    ];
                    if (userId !== removedBy) {
                        const targetMetadata =
                            this.deviceUtil.mapActivityLogTargetMetadata(
                                row,
                                removedBy,
                                sessions.length
                            );
                        const removedByAdminActivityLog =
                            this.activityLogDomain.prepare({
                                action: EnumActivityLogAction.userRemoveDeviceByAdmin,
                                userId,
                                createdBy: removedBy,
                                metadata: targetMetadata,
                            });
                        prepared.push(removedByAdminActivityLog);
                    }

                    return {
                        revokedSessions: sessions,
                        activityLogs: prepared,
                    };
                });
            await this.sessionDomain.purgeRevokedLogins(
                userId,
                revokedSessions
            );

            this.activityLogDomain.stagePrepared(activityLogs);

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
