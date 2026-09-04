import { ResponseUtil } from '@common/response/utils/response.util';
import {
    EnumDeviceNotificationProvider,
    EnumDevicePlatform,
} from '@generated/prisma-client';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { DeviceOwnershipResponseDto } from '@modules/device/dtos/response/device.ownership.response.dto';
import { IDeviceOwnership } from '@modules/device/interfaces/device.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceUtil {
    constructor(private readonly responseUtil: ResponseUtil) {}

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

    mapList(devices: IDeviceOwnership[]): DeviceOwnershipResponseDto[] {
        return this.responseUtil.serialize(DeviceOwnershipResponseDto, devices);
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
