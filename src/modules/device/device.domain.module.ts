import { DeviceRepositoryModule } from '@modules/device/device.repository.module';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { Module } from '@nestjs/common';
import { DeviceAnalyticDomain } from '@modules/device/domains/device.analytic.domain';

/** Device ownership tracking and notification-token lifecycle. */
@Module({
    controllers: [],
    providers: [DeviceDomain, DeviceUtil, DeviceAnalyticDomain],
    exports: [DeviceDomain, DeviceUtil, DeviceAnalyticDomain],
    imports: [DeviceRepositoryModule],
})
export class DeviceDomainModule {}
