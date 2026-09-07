import { DeviceModule } from '@modules/device/device.module';
import { DeviceHttpService } from '@modules/device/services/device.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [DeviceHttpService],
    exports: [DeviceHttpService],
    imports: [DeviceModule],
})
export class DeviceHttpModule {}
