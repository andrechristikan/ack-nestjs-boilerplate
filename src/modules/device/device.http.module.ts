import { AccountDomainModule } from '@modules/account/account.domain.module';
import { DeviceDomainModule } from '@modules/device/device.domain.module';
import { DeviceHttpService } from '@modules/device/services/device.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [DeviceHttpService],
    exports: [DeviceHttpService],
    imports: [DeviceDomainModule, AccountDomainModule],
})
export class DeviceHttpModule {}
