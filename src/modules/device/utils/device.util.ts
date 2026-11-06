import {
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
} from '@generated/prisma-client/client';
import type { IAnalyticDeviceProliferationResult } from '@modules/analytic/interfaces/analytic.anomaly.interface';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import type { DeviceRequestDto } from '@modules/device/dtos/request/device.request.dto';
import type {
    IDeviceIdentity,
    IDeviceOwnership,
    IDeviceOwnershipAnalyticUserCount,
} from '@modules/device/interfaces/device.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceUtil {
    /** Null when the token is null or the platform is web; android maps to fcm and ios to apns. */
    resolveNotificationProvider(
        platform: EnumDevicePlatform,
        notificationToken: string | null
    ): EnumDeviceNotificationProvider | null {
        if (notificationToken === null) {
            return null;
        }

        switch (platform) {
            case EnumDevicePlatform.android:
                return EnumDeviceNotificationProvider.fcm;
            case EnumDevicePlatform.ios:
                return EnumDeviceNotificationProvider.apns;
            case EnumDevicePlatform.web:
            default:
                return null;
        }
    }

    toIdentity(device: DeviceRequestDto): IDeviceIdentity {
        return {
            fingerprint: device.fingerprint,
            name: device.name ?? null,
            platform: device.platform,
            notificationToken: device.notificationToken ?? null,
        };
    }

    mapActivityLogMetadata(
        deviceOwnership: IDeviceOwnership,
        sessionCount: number
    ): IActivityLogMetadata {
        return {
            deviceOwnershipId: deviceOwnership.id,
            deviceId: deviceOwnership.device.id,
            sessionCount,
        };
    }

    mapActivityLogActorMetadata(
        deviceOwnership: IDeviceOwnership,
        sessionCount: number
    ): IActivityLogMetadata {
        const metadata = this.mapActivityLogMetadata(
            deviceOwnership,
            sessionCount
        );

        return {
            ...metadata,
            targetUserId: deviceOwnership.userId,
            targetUsername: deviceOwnership.user.username,
            timestamp: deviceOwnership.updatedAt,
        };
    }

    mapActivityLogTargetMetadata(
        deviceOwnership: IDeviceOwnership,
        actorUserId: string,
        sessionCount: number
    ): IActivityLogMetadata {
        const metadata = this.mapActivityLogMetadata(
            deviceOwnership,
            sessionCount
        );

        return {
            ...metadata,
            actorUserId,
            timestamp: deviceOwnership.updatedAt,
        };
    }

    /** Returns the users whose device-count z-score is above the threshold, highest count first; scores are 0 when the standard deviation is 0. */
    findProliferationOutliers(
        counts: IDeviceOwnershipAnalyticUserCount[],
        zScoreThreshold: number
    ): IAnalyticDeviceProliferationResult {
        if (counts.length === 0) {
            return { count: 0, avg: 0, stdDev: 0, rows: [] };
        }
        const avg = counts.reduce((s, c) => s + c.count, 0) / counts.length;
        const variance =
            counts.reduce((s, c) => s + (c.count - avg) ** 2, 0) /
            counts.length;
        const stdDev = Math.sqrt(variance);
        const rows = counts
            .map(c => ({
                userId: c.userId,
                deviceCount: c.count,
                zScore: stdDev === 0 ? 0 : (c.count - avg) / stdDev,
            }))
            .filter(r => r.zScore > zScoreThreshold)
            .sort((a, b) => b.deviceCount - a.deviceCount);

        return { count: rows.length, avg, stdDev, rows };
    }
}
