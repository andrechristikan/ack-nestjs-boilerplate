import { Module } from '@nestjs/common';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceRepository } from '@modules/device/repositories/device.repository';
import { DeviceUtil } from '@modules/device/utils/device.util';

@Module({
    imports: [],
    exports: [DeviceService, DeviceUtil, DeviceRepository],
    providers: [DeviceService, DeviceUtil, DeviceRepository],
    controllers: [],
})
export class DeviceModule {}
