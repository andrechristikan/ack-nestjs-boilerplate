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
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
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
import { DeviceUtil } from '@modules/device/utils/device.util';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceDomain {
    constructor(
        private readonly deviceOwnershipRepository: DeviceOwnershipRepository,
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
    ): Promise<IResponsePagingReturn<IDeviceOwnership>> {
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
    ): Promise<IResponsePagingReturn<IDeviceOwnershipWithSession>> {
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
        const { count } = await this.deviceOwnershipRepository.cleanupTokens(
            userId,
            tokens
        );

        return count;
    }

    async cleanupStaleNotificationTokens(
        thresholdInMs: number
    ): Promise<number> {
        const { count } =
            await this.deviceOwnershipRepository.cleanupStaleTokens(
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
        return this.deviceOwnershipRepository.upsertForLoginInTx(
            tx,
            userId,
            device,
            notificationProvider,
            now
        );
    }

    async clearNotificationInTx(
        tx: IDatabaseTransactionClient,
        deviceOwnershipId: string,
        now: Date
    ): Promise<void> {
        await this.deviceOwnershipRepository.clearNotificationInTx(
            tx,
            deviceOwnershipId,
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

        try {
            await this.databaseService.withTransaction(async tx => {
                await this.deviceOwnershipRepository.refreshInTx(
                    tx,
                    userId,
                    deviceOwnershipId,
                    data,
                    notificationProvider,
                    now
                );
                this.activityLogDomain.stage({
                    action: EnumActivityLogAction.userDeviceRefresh,
                });
            });

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
            const revokedSessions = await this.databaseService.withTransaction(
                async tx => {
                    const sessions =
                        await this.sessionDomain.revokeByDeviceOwnershipInTx(
                            tx,
                            userId,
                            deviceOwnershipId,
                            userId,
                            now
                        );
                    await this.deviceOwnershipRepository.removeOwnershipInTx(
                        tx,
                        userId,
                        deviceOwnershipId,
                        userId,
                        now
                    );
                    this.activityLogDomain.stage({
                        action: EnumActivityLogAction.userRemoveDevice,
                        userId: userId,
                        createdBy: userId,
                    });

                    return sessions;
                }
            );
            await this.sessionDomain.purgeRevokedLogins(
                userId,
                revokedSessions
            );

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
            const { removed, revokedSessions } =
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

                    return { removed: row, revokedSessions: sessions };
                });
            await this.sessionDomain.purgeRevokedLogins(
                userId,
                revokedSessions
            );

            this.activityLogDomain.stage({
                action: EnumActivityLogAction.adminDeviceRemove,
                metadata: this.deviceUtil.mapActivityLogActorMetadata(removed),
            });
            if (userId !== removedBy) {
                this.activityLogDomain.stage({
                    action: EnumActivityLogAction.userRemoveDeviceByAdmin,
                    userId,
                    createdBy: removedBy,
                    metadata: this.deviceUtil.mapActivityLogTargetMetadata(
                        removed,
                        removedBy
                    ),
                });
            }

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
