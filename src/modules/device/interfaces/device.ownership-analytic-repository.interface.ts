import type { IAnalyticSharedFingerprint } from '@modules/analytic/interfaces/analytic.fraud.interface';
import type {
    IDeviceOwnershipAnalyticCreated,
    IDeviceOwnershipAnalyticInactive,
    IDeviceOwnershipAnalyticUserCount,
} from '@modules/device/interfaces/device.interface';

export interface IDeviceOwnershipAnalyticRepository {
    countOwnerships(): Promise<number>;
    countPerUser(): Promise<IDeviceOwnershipAnalyticUserCount[]>;
    findInactive(before: Date): Promise<IDeviceOwnershipAnalyticInactive[]>;
    findCreatedInRange(
        startDate: Date,
        endDate: Date
    ): Promise<IDeviceOwnershipAnalyticCreated[]>;
    sharedFingerprints(minUsers: number): Promise<IAnalyticSharedFingerprint[]>;
}
