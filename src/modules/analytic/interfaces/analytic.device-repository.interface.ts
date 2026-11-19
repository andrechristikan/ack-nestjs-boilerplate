import type {
    IAnalyticCountBucket,
    IAnalyticDevicePushTokenCount,
} from '@modules/analytic/interfaces/analytic.interface';

export interface IAnalyticDeviceRepository {
    groupPlatform(): Promise<IAnalyticCountBucket[]>;
    countPushToken(): Promise<IAnalyticDevicePushTokenCount>;
    groupPerUser(): Promise<IAnalyticCountBucket[]>;
    countInactive(before: Date): Promise<number>;
}
