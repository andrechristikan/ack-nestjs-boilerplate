import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { DeviceResponseDto } from '@modules/device/dtos/response/device.response.dto';
import { IDevice } from '@modules/device/interfaces/device.interface';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class DeviceUtil {
    mapList(devices: IDevice[]): DeviceResponseDto[] {
        return plainToInstance(DeviceResponseDto, devices);
    }

    mapActivityLogMetadata(device: IDevice): IActivityLogMetadata {
        return {
            deviceId: device.id,
            userId: device.userId,
            userUsername: device.user.username,
            timestamp: device.updatedAt ?? device.createdAt,
            sessionCount: device._count.sessions,
        };
    }
}
