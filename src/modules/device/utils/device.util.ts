import {
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
} from '@generated/prisma-client/client';
import type { IAnalyticDeviceProliferationResult } from '@modules/analytic/interfaces/analytic.anomaly.interface';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import type {
    IDeviceOwnership,
    IDeviceOwnershipAnalyticUserCount,
} from '@modules/device/interfaces/device.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceUtil {
    /** Maps a device platform onto the push provider that serves it. */
    resolveNotificationProvider(
        platform: EnumDevicePlatform | null
    ): EnumDeviceNotificationProvider | null {
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

    /** Projects an ownership and the number of sessions its removal revoked into device activity metadata. */
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

    /** Projects an ownership into the metadata of the admin row that removed it. */
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

    /** Projects an ownership into the metadata of the owner's row for an admin removal. */
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

    /** Scores each user's device count against the population and returns those above the z-score threshold, highest first. */
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
