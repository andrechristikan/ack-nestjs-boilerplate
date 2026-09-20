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
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import type {
    IDeviceIdentity,
    IDeviceLoginUpsert,
    IDeviceOwnership,
    IDeviceOwnershipWithDevice,
    IDeviceOwnershipWithSession,
    IDeviceRefresh,
} from '@modules/device/interfaces/device.interface';
import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { DeviceRepository } from '@modules/device/repositories/device.repository';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceDomain {
    constructor(
        private readonly deviceOwnershipRepository: DeviceOwnershipRepository,
        private readonly deviceRepository: DeviceRepository,
        private readonly sessionDomain: SessionDomain,
        private readonly deviceUtil: DeviceUtil,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
    ) {}

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePaginationReturn<IDeviceOwnership>> {
        return this.deviceOwnershipRepository.findWithPaginationOffsetByAdmin(
            userId,
            pagination,
            isRevoked
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
    ): Promise<IDeviceOwnershipWithDevice[]> {
        return this.deviceOwnershipRepository.findTokensByUserId(userId);
    }

    async cleanupNotificationTokens(
        userId: string,
        tokens: string[]
    ): Promise<number> {
        const deviceIds =
            await this.deviceOwnershipRepository.findDeviceIdsByUserAndTokens(
                userId,
                tokens
            );
        const { count } = await this.deviceRepository.clearTokens(
            deviceIds,
            userId
        );

        return count;
    }

    async cleanupStaleNotificationTokens(
        thresholdInMs: number
    ): Promise<number> {
        const { count } =
            await this.deviceRepository.clearStaleTokens(thresholdInMs);

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
            notificationProvider,
            now
        );
        const { deviceOwnership, isNewOwnership } =
            await this.deviceOwnershipRepository.upsertForLoginInTx(
                tx,
                userId,
                upserted.id,
                now
            );

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
        const deviceId =
            await this.deviceOwnershipRepository.findLiveDeviceIdInTx(
                tx,
                userId,
                deviceOwnershipId
            );
        if (deviceId === null) {
            throw new DeviceNotFoundException();
        }

        await this.deviceRepository.clearNotificationByIdsInTx(
            tx,
            [deviceId],
            updatedBy,
            now
        );
    }

    async revokeAllByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        revokedBy: string,
        now: Date
    ): Promise<void> {
        const deviceIds =
            await this.deviceOwnershipRepository.revokeAllByUserInTx(
                tx,
                userId,
                revokedBy,
                now
            );
        if (deviceIds.length === 0) {
            return;
        }

        await this.deviceRepository.clearNotificationByIdsInTx(
            tx,
            deviceIds,
            revokedBy,
            now
        );
    }

    async refresh(
        userId: string,
        deviceOwnershipId: string,
        data: IDeviceRefresh
    ): Promise<void> {
        const deviceOwnershipExists =
            await this.deviceOwnershipRepository.existsActive(
                userId,
                deviceOwnershipId
            );
        if (!deviceOwnershipExists) {
            throw new DeviceNotFoundException();
        }
        const notificationProvider =
            this.deviceUtil.resolveNotificationProvider(data.platform ?? null);
        const now = this.helperDateService.create();
        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userDeviceRefresh,
            }),
        ];

        try {
            await this.databaseService.withTransaction(async tx => {
                const deviceId = await this.deviceOwnershipRepository.touchInTx(
                    tx,
                    userId,
                    deviceOwnershipId,
                    now
                );
                await this.deviceRepository.refreshInTx(
                    tx,
                    deviceId,
                    data,
                    notificationProvider,
                    now
                );
            });

            this.activityLogDomain.stagePrepared(events);

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async remove(userId: string, deviceOwnershipId: string): Promise<void> {
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
            const { revokedSessions, events } =
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
                    await this.deviceRepository.clearNotificationByIdsInTx(
                        tx,
                        [row.deviceId],
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

                    return { revokedSessions: sessions, events: prepared };
                });
            await this.sessionDomain.purgeRevokedLogins(
                userId,
                revokedSessions
            );

            this.activityLogDomain.stagePrepared(events);

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
        removedBy: string
    ): Promise<void> {
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
            const { revokedSessions, events } =
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
                    await this.deviceRepository.clearNotificationByIdsInTx(
                        tx,
                        [row.deviceId],
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
                        const removedByAdminEvent =
                            this.activityLogDomain.prepare({
                                action: EnumActivityLogAction.userRemoveDeviceByAdmin,
                                userId,
                                createdBy: removedBy,
                                metadata: targetMetadata,
                            });
                        prepared.push(removedByAdminEvent);
                    }

                    return { revokedSessions: sessions, events: prepared };
                });
            await this.sessionDomain.purgeRevokedLogins(
                userId,
                revokedSessions
            );

            this.activityLogDomain.stagePrepared(events);

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
