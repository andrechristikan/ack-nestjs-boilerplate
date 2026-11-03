import type { IAnalyticSharedFingerprint } from '@modules/analytic/interfaces/analytic.fraud.interface';
import type {
    IDeviceOwnershipAnalyticCreated,
    IDeviceOwnershipAnalyticUserCount,
} from '@modules/device/interfaces/device.interface';

export interface IDeviceOwnershipAnalyticRepository {
    countOwnerships(): Promise<number>;
    countPerUser(): Promise<IDeviceOwnershipAnalyticUserCount[]>;
    countInactive(before: Date): Promise<number>;
    findCreatedInRangeByUser(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<IDeviceOwnershipAnalyticCreated[]>;
    findSharedFingerprints(
        minUsers: number
    ): Promise<IAnalyticSharedFingerprint[]>;
}
