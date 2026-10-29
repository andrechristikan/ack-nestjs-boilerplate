import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { Device } from '@generated/prisma-client/client';
import type {
    IDeviceIdentity,
    IDeviceRefresh,
} from '@modules/device/interfaces/device.interface';

export interface IDeviceRepository {
    upsertByFingerprintInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        { fingerprint, name, platform }: IDeviceIdentity,
        now: Date
    ): Promise<Device>;
    refreshInTx(
        tx: IDatabaseTransactionClient,
        deviceId: string,
        { name, platform }: IDeviceRefresh,
        now: Date
    ): Promise<void>;
}
