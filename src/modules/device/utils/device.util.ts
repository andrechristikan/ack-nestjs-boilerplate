import {
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
} from '@generated/prisma-client';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { IDeviceOwnership } from '@modules/device/interfaces/device.interface';
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

    /** Projects an ownership into the activity-log metadata shape the interceptor expects. */
    mapActivityLogMetadata(
        deviceOwnership: IDeviceOwnership
    ): IActivityLogMetadata {
        return {
            deviceOwnershipId: deviceOwnership.id,
            deviceId: deviceOwnership.device.id,
            userId: deviceOwnership.userId,
            userUsername: deviceOwnership.user.username,
            timestamp: deviceOwnership.updatedAt,
            sessionCount: deviceOwnership._count.sessions,
        };
    }
}
