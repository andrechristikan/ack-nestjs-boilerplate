import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
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
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DeviceDomain {
    private readonly logger = new Logger(DeviceDomain.name);

    constructor(
        private readonly deviceOwnershipRepository: DeviceOwnershipRepository,
        private readonly deviceRepository: DeviceRepository,
        private readonly deviceUtil: DeviceUtil,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
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

    async getNotificationTokens(userId: string): Promise<string[]> {
        const now = this.helperDateService.create();

        return this.deviceOwnershipRepository.findTokensByUserId(userId, now);
    }

    async clearNotificationsWithoutLiveSession(
        userId: string,
        now: Date
    ): Promise<void> {
        await this.deviceOwnershipRepository.clearTokensWithoutLiveSession(
            userId,
            now
        );
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
        now: Date
    ): Promise<IDeviceLoginUpsert> {
        const notificationProvider =
            this.deviceUtil.resolveNotificationProvider(
                device.platform,
                device.notificationToken
            );
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

    async removeOwnershipInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        removedBy: string,
        now: Date
    ): Promise<IDeviceOwnership> {
        const deviceOwnership =
            await this.deviceOwnershipRepository.removeOwnershipInTx(
                tx,
                userId,
                deviceOwnershipId,
                removedBy,
                now
            );
        if (deviceOwnership === null) {
            throw new DeviceNotFoundException();
        }

        return deviceOwnership;
    }

    async refresh(
        userId: string,
        deviceOwnershipId: string,
        data: IDeviceRefresh
    ): Promise<void> {
        const notificationProvider =
            this.deviceUtil.resolveNotificationProvider(
                data.platform,
                data.notificationToken
            );
        const now = this.helperDateService.create();

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
                if (deviceId === null) {
                    throw new DeviceNotFoundException();
                }
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
}
