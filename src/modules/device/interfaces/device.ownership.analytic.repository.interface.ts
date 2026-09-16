import { IAnalyticSharedFingerprintRow } from '@modules/analytic/interfaces/analytic.fraud.interface';
import { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';

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
    countRegistrations(startDate: Date, endDate: Date): Promise<number>;
    groupByPlatform(): Promise<IAnalyticCountBucket[]>;
    countWithPushToken(): Promise<number>;
    countDevices(): Promise<number>;
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
