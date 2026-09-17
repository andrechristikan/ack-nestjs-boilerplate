import type { IAnalyticSharedFingerprintRow } from '@modules/analytic/interfaces/analytic.fraud.interface';

export interface IDeviceOwnershipAnalyticUserCount {
    userId: string;
    count: number;
}

export interface IDeviceOwnershipAnalyticInactiveRow {
    id: string;
    userId: string;
    lastActiveAt: Date;
    deviceId: string;
}

export interface IDeviceOwnershipAnalyticCreatedRow {
    id: string;
    userId: string;
    deviceId: string;
    createdAt: Date;
}

export interface IDeviceOwnershipAnalyticRepository {
    countOwnerships(): Promise<number>;
    countPerUser(): Promise<IDeviceOwnershipAnalyticUserCount[]>;
    findInactive(before: Date): Promise<IDeviceOwnershipAnalyticInactiveRow[]>;
    findCreatedInRange(
        startDate: Date,
        endDate: Date
    ): Promise<IDeviceOwnershipAnalyticCreatedRow[]>;
    sharedFingerprints(
        minUsers: number
    ): Promise<IAnalyticSharedFingerprintRow[]>;
}
