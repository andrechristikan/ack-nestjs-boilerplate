import { DeviceDomainModule } from '@modules/device/device.domain.module';
import { DeviceHttpService } from '@modules/device/services/device.http.service';
import { UserDomainModule } from '@modules/user/user.domain.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [DeviceHttpService],
    exports: [DeviceHttpService],
    imports: [DeviceDomainModule, UserDomainModule],
})
export class DeviceHttpModule {}
