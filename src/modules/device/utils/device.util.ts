import type { DeviceRequestDto } from '@modules/device/dtos/request/device.request.dto';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceUtil {
    toIdentity(device: DeviceRequestDto): IDeviceIdentity {
        return {
            fingerprint: device.fingerprint,
            name: device.name ?? null,
            platform: device.platform,
            notificationToken: device.notificationToken ?? null,
        };
    }
}
