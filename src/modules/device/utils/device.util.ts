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

    /** Projects an ownership into the metadata of the admin row that removed it. */
    mapActivityLogActorMetadata(
        deviceOwnership: IDeviceOwnership
    ): IActivityLogMetadata {
        return {
            deviceOwnershipId: deviceOwnership.id,
            deviceId: deviceOwnership.device.id,
            targetUserId: deviceOwnership.userId,
            targetUsername: deviceOwnership.user.username,
            timestamp: deviceOwnership.updatedAt,
            sessionCount: deviceOwnership._count.sessions,
        };
    }

    /** Projects an ownership into the metadata of the owner's row for an admin removal. */
    mapActivityLogTargetMetadata(
        deviceOwnership: IDeviceOwnership,
        actorUserId: string
    ): IActivityLogMetadata {
        return {
            deviceOwnershipId: deviceOwnership.id,
            deviceId: deviceOwnership.device.id,
            actorUserId,
            timestamp: deviceOwnership.updatedAt,
            sessionCount: deviceOwnership._count.sessions,
        };
    }
}
