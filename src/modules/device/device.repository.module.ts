import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [DeviceOwnershipRepository],
    exports: [DeviceOwnershipRepository],
    imports: [],
})
export class DeviceRepositoryModule {}
