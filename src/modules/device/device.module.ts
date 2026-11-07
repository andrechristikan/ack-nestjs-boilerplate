import { DeviceAnalyticRepository } from '@modules/device/repositories/device.analytic.repository';
import { DeviceOwnershipAnalyticRepository } from '@modules/device/repositories/device.ownership.analytic.repository';
import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { DeviceRepository } from '@modules/device/repositories/device.repository';
import { DeviceAnalyticService } from '@modules/device/services/device.analytic.service';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        DeviceOwnershipRepository,
        DeviceOwnershipAnalyticRepository,
        DeviceRepository,
        DeviceAnalyticRepository,
        DeviceService,
        DeviceUtil,
        DeviceAnalyticService,
    ],
    exports: [DeviceService, DeviceUtil, DeviceAnalyticService],
    imports: [],
})
export class DeviceModule {}
