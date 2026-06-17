import { ResponseUtil } from '@common/response/utils/response.util';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { DeviceOwnershipResponseDto } from '@modules/device/dtos/response/device.ownership.response';
import { IDeviceOwnership } from '@modules/device/interfaces/device.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceUtil {
    constructor(private readonly responseUtil: ResponseUtil) {}

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
            timestamp: deviceOwnership.updatedAt ?? deviceOwnership.createdAt,
            sessionCount: deviceOwnership._count.sessions,
        };
    }
}
