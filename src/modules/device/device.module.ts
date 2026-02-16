import { Module } from '@nestjs/common';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceRepository } from '@modules/device/repositories/device.repository';

@Module({
    imports: [],
    exports: [DeviceService, DeviceRepository],
    providers: [DeviceService, DeviceRepository],
    controllers: [],
})
export class DeviceModule {}
