import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
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
    EnumDevicePlatform,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
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
import { OutboxService } from '@common/outbox/services/outbox.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class DeviceService {
    private readonly logger = new Logger(DeviceService.name);
    private readonly idleTimeoutInMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly deviceOwnershipRepository: DeviceOwnershipRepository,
        private readonly deviceRepository: DeviceRepository,
        private readonly helperDateService: HelperDateService,
        private readonly outboxService: OutboxService,
        private readonly activityLogQueue: ActivityLogQueue
    ) {
        this.idleTimeoutInMs = this.configService.get<number>(
            'session.idleTimeoutInMs'
        )!;
    }

    private async clearTokenFromOtherUsersInTx(
        tx: IDatabaseTransactionClient,
        notificationToken: string | null,
        userId: string
    ): Promise<void> {
        if (notificationToken === null) {
            return;
        }

        await this.deviceOwnershipRepository.clearTokenFromOtherUsersInTx(
            tx,
            notificationToken,
            userId
        );
    }

    private resolveNotificationProvider(
        platform: EnumDevicePlatform,
        notificationToken: string | null
    ): EnumDeviceNotificationProvider | null {
        if (notificationToken === null) {
            return null;
        }

        switch (platform) {
            case EnumDevicePlatform.android:
                return EnumDeviceNotificationProvider.fcm;
            case EnumDevicePlatform.ios:
                return EnumDeviceNotificationProvider.apns;
            case EnumDevicePlatform.web:
            default:
                return null;
        }
    }

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams,
        isRevoked?: Record<string, IPaginationEqual>
    ): Promise<IResponsePaginationReturn<IDeviceOwnership>> {
        const now = this.helperDateService.create();
        const idleSince = this.helperDateService.backward(
            now,
            Duration.fromObject({ milliseconds: this.idleTimeoutInMs })
        );

        return this.deviceOwnershipRepository.findWithPaginationOffsetByAdmin(
            userId,
            pagination,
            isRevoked ?? null,
            idleSince
        );
    }

    async getListCursor(
        userId: string,
        sessionId: string,
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePaginationReturn<IDeviceOwnershipWithSession>> {
        const now = this.helperDateService.create();
        const idleSince = this.helperDateService.backward(
            now,
            Duration.fromObject({ milliseconds: this.idleTimeoutInMs })
        );

        return this.deviceOwnershipRepository.findActiveWithPaginationCursor(
            userId,
            sessionId,
            pagination,
            idleSince
        );
    }

    async getNotificationTokens(userId: string): Promise<string[]> {
        const now = this.helperDateService.create();
        const idleSince = this.helperDateService.backward(
            now,
            Duration.fromObject({ milliseconds: this.idleTimeoutInMs })
        );

        return this.deviceOwnershipRepository.findTokensByUserId(
            userId,
            now,
            idleSince
        );
    }

    async cleanupNotificationTokensInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        tokens: string[]
    ): Promise<void> {
        await this.deviceOwnershipRepository.clearTokensInTx(
            tx,
            userId,
            tokens
        );
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
        const notificationProvider = this.resolveNotificationProvider(
            device.platform,
            device.notificationToken
        );
        const [upserted] = await Promise.all([
            this.deviceRepository.upsertByFingerprintInTx(
                tx,
                userId,
                device,
                now
            ),
            this.clearTokenFromOtherUsersInTx(
                tx,
                device.notificationToken,
                userId
            ),
        ]);
        const { deviceOwnership, isNewOwnership } =
            await this.deviceOwnershipRepository.upsertActiveInTx(
                tx,
                upserted.id,
                userId,
                device.notificationToken,
                notificationProvider,
                now
            );

        const otherOwnershipIds =
            await this.deviceOwnershipRepository.findOtherIdsByDeviceInTx(
                tx,
                upserted.id,
                userId
            );

        return {
            device: upserted,
            deviceOwnership,
            isNewDevice: isNewOwnership,
            otherOwnershipIds,
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

    async touchOwnershipInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        now: Date
    ): Promise<void> {
        const deviceId = await this.deviceOwnershipRepository.touchInTx(
            tx,
            userId,
            deviceOwnershipId,
            now
        );
        if (deviceId !== null) {
            await this.deviceRepository.touchInTx(tx, deviceId, now);
        }
    }

    async removeOwnershipInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deviceOwnershipId: string,
        removedBy: string,
        now: Date
    ): Promise<IDeviceOwnership> {
        const idleSince = this.helperDateService.backward(
            now,
            Duration.fromObject({ milliseconds: this.idleTimeoutInMs })
        );
        const deviceOwnership =
            await this.deviceOwnershipRepository.removeOwnershipInTx(
                tx,
                userId,
                deviceOwnershipId,
                removedBy,
                now,
                idleSince
            );
        if (deviceOwnership === null) {
            throw new DeviceNotFoundException();
        }

        return deviceOwnership;
    }

    /** Refreshes the ownership and its device on the caller's transaction, clears the token from other users, and adds the refresh entry; no live ownership throws DeviceNotFoundException. */
    async refreshInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        deviceOwnershipId: string,
        data: IDeviceRefresh
    ): Promise<void> {
        const userId = authContext.userId;
        const notificationProvider = this.resolveNotificationProvider(
            data.platform,
            data.notificationToken
        );
        const now = this.helperDateService.create();

        const deviceId = await this.deviceOwnershipRepository.refreshInTx(
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
        await Promise.all([
            this.deviceRepository.refreshInTx(tx, deviceId, data, now),
            this.clearTokenFromOtherUsersInTx(
                tx,
                data.notificationToken,
                userId
            ),
        ]);

        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.userDeviceRefreshed,
            }
        );
        await this.outboxService.addInTx(tx, entry);
    }
}
