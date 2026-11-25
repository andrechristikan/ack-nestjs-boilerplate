import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { Device } from '@generated/prisma-client/client';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import type {
    IDeviceIdentity,
    IDeviceRefresh,
} from '@modules/device/interfaces/device.interface';
import type { IDeviceRepository } from '@modules/device/interfaces/device.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceRepository implements IDeviceRepository {
    constructor(private readonly databaseUtil: DatabaseUtil) {}

    async upsertByFingerprintInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { fingerprint, name, platform }: IDeviceIdentity,
        now: Date
    ): Promise<Device> {
        return tx.device.upsert({
            where: { fingerprint },
            update: {
                ...(name !== null && { name }),
                platform,
                lastActiveAt: now,
                updatedBy: userId,
            },
            create: {
                fingerprint,
                name,
                platform,
                lastActiveAt: now,
                createdBy: userId,
            },
        });
    }

    async refreshInTx(
        tx: IDatabaseTransactionClient,
        deviceId: string,
        { name, platform }: IDeviceRefresh,
        now: Date
    ): Promise<void> {
        try {
            await tx.device.update({
                where: { id: deviceId },
                data: {
                    name,
                    platform,
                    lastActiveAt: now,
                },
            });
        } catch (error: unknown) {
            throw this.databaseUtil.toWriteException(
                error,
                new DeviceNotFoundException()
            );
        }
    }

    async touchInTx(
        tx: IDatabaseTransactionClient,
        deviceId: string,
        now: Date
    ): Promise<void> {
        await tx.device.update({
            where: { id: deviceId },
            data: { lastActiveAt: now },
        });
    }
}
