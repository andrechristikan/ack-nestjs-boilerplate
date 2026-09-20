import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';

export interface IDeviceAnalyticRepository {
    countRegistrations(startDate: Date, endDate: Date): Promise<number>;
    groupByPlatform(): Promise<IAnalyticCountBucket[]>;
    countWithPushToken(): Promise<number>;
    countDevices(): Promise<number>;
}
