import { DeviceRepositoryModule } from '@modules/device/device.repository.module';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { Module } from '@nestjs/common';

/** Device ownership tracking and notification-token lifecycle. */
@Module({
    controllers: [],
    providers: [DeviceDomain, DeviceUtil],
    exports: [DeviceDomain, DeviceUtil],
    imports: [DeviceRepositoryModule],
})
export class DeviceDomainModule {}
