import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumDevicePlatform } from '@generated/prisma-client/client';
import type {
    Device,
    EnumDeviceNotificationProvider,
    Prisma,
} from '@generated/prisma-client/client';
import type {
    IDeviceIdentity,
    IDeviceRefresh,
} from '@modules/device/interfaces/device.interface';
import type { IDeviceRepository } from '@modules/device/interfaces/device.repository.interface';
import { Injectable } from '@nestjs/common';
import { Duration } from 'luxon';

@Injectable()
export class DeviceRepository implements IDeviceRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService
    ) {}

    async upsertByFingerprintInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { fingerprint, name, notificationToken, platform }: IDeviceIdentity,
        notificationProvider: EnumDeviceNotificationProvider | null,
        now: Date
    ): Promise<Device> {
        const devicePlatform = platform ?? EnumDevicePlatform.web;

        return tx.device.upsert({
            where: {
                fingerprint,
            },
            update: {
                name,
                platform: devicePlatform,
                notificationToken,
                lastActiveAt: now,
                notificationProvider,
                updatedBy: userId,
            },
            create: {
                fingerprint,
                name,
                platform: devicePlatform,
                notificationToken,
                lastActiveAt: now,
                notificationProvider,
                createdBy: userId,
            },
        });
    }

    async clearNotificationByIdsInTx(
        tx: IDatabaseTransactionClient,
        deviceIds: string[],
        updatedBy: string,
        now: Date
    ): Promise<void> {
        await tx.device.updateMany({
            where: {
                id: { in: deviceIds },
            },
            data: {
                notificationToken: null,
                notificationProvider: null,
                lastActiveAt: now,
                updatedBy,
            },
        });
    }

    async refreshInTx(
        tx: IDatabaseTransactionClient,
        deviceId: string,
        { name, notificationToken, platform }: IDeviceRefresh,
        notificationProvider: EnumDeviceNotificationProvider | null,
        now: Date
    ): Promise<void> {
        await tx.device.update({
            where: { id: deviceId },
            data: {
                name,
                platform,
                notificationProvider,
                notificationToken,
                lastActiveAt: now,
            },
        });
    }

    async clearTokens(
        deviceIds: string[],
        updatedBy: string
    ): Promise<Prisma.BatchPayload> {
        return this.databaseService.client.device.updateMany({
            where: {
                id: { in: deviceIds },
            },
            data: {
                notificationToken: null,
                notificationProvider: null,
                updatedBy,
            },
        });
    }

    async clearStaleTokens(
        thresholdInMs: number
    ): Promise<Prisma.BatchPayload> {
        const today = this.helperDateService.create();
        const thresholdDate = this.helperDateService.backward(
            today,
            Duration.fromMillis(thresholdInMs)
        );

        return this.databaseService.client.device.updateMany({
            where: {
                notificationToken: {
                    not: null,
                },
                lastActiveAt: {
                    lt: thresholdDate,
                },
            },
            data: {
                notificationToken: null,
                notificationProvider: null,
            },
        });
    }
}
