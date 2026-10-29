import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumDevicePlatform } from '@generated/prisma-client/client';
import type { Device } from '@generated/prisma-client/client';
import type {
    IDeviceIdentity,
    IDeviceRefresh,
} from '@modules/device/interfaces/device.interface';
import type { IDeviceRepository } from '@modules/device/interfaces/device.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceRepository implements IDeviceRepository {
    async upsertByFingerprintInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { fingerprint, name, platform }: IDeviceIdentity,
        now: Date
    ): Promise<Device> {
        const devicePlatform = platform ?? EnumDevicePlatform.web;

        return tx.device.upsert({
            where: { fingerprint },
            update: {
                ...(name !== null && { name }),
                platform: devicePlatform,
                lastActiveAt: now,
                updatedBy: userId,
            },
            create: {
                fingerprint,
                name,
                platform: devicePlatform,
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
        await tx.device.update({
            where: { id: deviceId },
            data: {
                ...(name !== null && { name }),
                ...(platform !== null && { platform }),
                lastActiveAt: now,
            },
        });
    }
}
