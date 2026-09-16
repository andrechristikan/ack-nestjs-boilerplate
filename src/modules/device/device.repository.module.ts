import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { Module } from '@nestjs/common';
import { DeviceOwnershipAnalyticRepository } from '@modules/device/repositories/device.ownership.analytic.repository';

@Module({
    controllers: [],
    providers: [DeviceOwnershipRepository, DeviceOwnershipAnalyticRepository],
    exports: [DeviceOwnershipRepository, DeviceOwnershipAnalyticRepository],
    imports: [],
})
export class DeviceRepositoryModule {}
