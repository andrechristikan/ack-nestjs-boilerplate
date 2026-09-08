import { DeviceRepositoryModule } from '@modules/device/device.repository.module';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { Module } from '@nestjs/common';

/** Device ownership tracking and notification-token lifecycle. */
@Module({
    controllers: [],
    providers: [DeviceService, DeviceUtil],
    exports: [DeviceService, DeviceUtil],
    imports: [DeviceRepositoryModule],
})
export class DeviceModule {}
