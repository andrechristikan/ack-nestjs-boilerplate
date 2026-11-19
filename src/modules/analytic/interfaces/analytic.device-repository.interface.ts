import type {
    IAnalyticCountBucket,
    IAnalyticDevicePushTokenCount,
    IAnalyticSessionDeviceCount,
} from '@modules/analytic/interfaces/analytic.interface';

export interface IAnalyticDeviceRepository {
    countRegistrations(startDate: Date, endDate: Date): Promise<number>;
    groupPlatform(): Promise<IAnalyticCountBucket[]>;
    countPushToken(): Promise<IAnalyticDevicePushTokenCount>;
    countInfoRefresh(startDate: Date, endDate: Date): Promise<number>;
    findSessionRatioCounts(
        now: Date,
        idleSince: Date
    ): Promise<IAnalyticSessionDeviceCount>;
    groupPerUser(): Promise<IAnalyticCountBucket[]>;
    countInactive(before: Date): Promise<number>;
}
