import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { DeviceRepository } from '@modules/device/repositories/device.repository';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        DeviceOwnershipRepository,
        DeviceRepository,
        DeviceService,
        DeviceUtil,
    ],
    exports: [DeviceService, DeviceUtil],
    imports: [ActivityLogModule],
})
export class DeviceModule {}
