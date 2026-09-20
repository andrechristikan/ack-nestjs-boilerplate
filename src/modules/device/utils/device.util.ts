import {
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
} from '@generated/prisma-client/client';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IDeviceOwnership } from '@modules/device/interfaces/device.interface';
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
}
