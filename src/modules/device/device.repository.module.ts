import { DeviceAnalyticRepository } from '@modules/device/repositories/device.analytic.repository';
import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { DeviceRepository } from '@modules/device/repositories/device.repository';
import { Module } from '@nestjs/common';
import { DeviceOwnershipAnalyticRepository } from '@modules/device/repositories/device.ownership.analytic.repository';

@Module({
    controllers: [],
    providers: [
        DeviceOwnershipRepository,
        DeviceOwnershipAnalyticRepository,
        DeviceRepository,
        DeviceAnalyticRepository,
    ],
    exports: [
        DeviceOwnershipRepository,
        DeviceOwnershipAnalyticRepository,
        DeviceRepository,
        DeviceAnalyticRepository,
    ],
    imports: [],
})
export class DeviceRepositoryModule {}
