import type { IAnalyticSharedFingerprint } from '@modules/analytic/interfaces/analytic.fraud.interface';
import type { IDeviceOwnershipAnalyticUserCount } from '@modules/device/interfaces/device.interface';

export interface IDeviceOwnershipAnalyticRepository {
    countOwnerships(): Promise<number>;
    countPerUser(): Promise<IDeviceOwnershipAnalyticUserCount[]>;
    countInactive(before: Date): Promise<number>;
    existsCreatedInRangeByUser(
        userId: string,
        startDate: Date,
        endDate: Date
    ): Promise<boolean>;
    findSharedFingerprints(
        minUsers: number
    ): Promise<IAnalyticSharedFingerprint[]>;
}
