import { DeviceDomainModule } from '@modules/device/device.domain.module';
import { DeviceHttpService } from '@modules/device/services/device.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [DeviceHttpService],
    exports: [DeviceHttpService],
    imports: [DeviceDomainModule],
})
export class DeviceHttpModule {}
