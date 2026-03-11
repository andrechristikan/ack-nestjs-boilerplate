import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { DeviceOwnershipResponseDto } from '@modules/device/dtos/response/device.ownership.response';
import { DeviceResponseDto } from '@modules/device/dtos/response/device.response.dto';
import { IDeviceOwnership } from '@modules/device/interfaces/device.interface';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class DeviceUtil {
    mapList(devices: IDeviceOwnership[]): DeviceOwnershipResponseDto[] {
        return plainToInstance(DeviceOwnershipResponseDto, devices);
    }

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
