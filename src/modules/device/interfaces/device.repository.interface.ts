import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    Device,
    EnumDeviceNotificationProvider,
    Prisma,
} from '@generated/prisma-client/client';
import type {
    IDeviceIdentity,
    IDeviceRefresh,
} from '@modules/device/interfaces/device.interface';

export interface IDeviceRepository {
    upsertByFingerprintInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { fingerprint, name, notificationToken, platform }: IDeviceIdentity,
        notificationProvider: EnumDeviceNotificationProvider | null,
        now: Date
    ): Promise<Device>;
    clearNotificationByIdsInTx(
        tx: IDatabaseTransactionClient,
        deviceIds: string[],
        updatedBy: string,
        now: Date
    ): Promise<void>;
    refreshInTx(
        tx: IDatabaseTransactionClient,
        deviceId: string,
        { name, notificationToken, platform }: IDeviceRefresh,
        notificationProvider: EnumDeviceNotificationProvider | null,
        now: Date
    ): Promise<void>;
    clearTokens(
        deviceIds: string[],
        updatedBy: string
    ): Promise<Prisma.BatchPayload>;
    clearStaleTokens(thresholdInMs: number): Promise<Prisma.BatchPayload>;
}
