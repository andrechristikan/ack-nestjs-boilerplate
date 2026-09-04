import { DeviceRepositoryModule } from '@modules/device/device.repository.module';
import { DeviceUtilModule } from '@modules/device/device.util.module';
import { DeviceService } from '@modules/device/services/device.service';
import { Module } from '@nestjs/common';

/** Device ownership tracking and notification-token lifecycle. */
@Module({
    controllers: [],
    providers: [DeviceService],
    exports: [DeviceService],
    imports: [DeviceRepositoryModule, DeviceUtilModule],
})
export class DeviceModule {}
