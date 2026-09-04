import { DeviceModule } from '@modules/device/device.module';
import { DeviceUtilModule } from '@modules/device/device.util.module';
import { DeviceHttpService } from '@modules/device/services/device.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [DeviceHttpService],
    exports: [DeviceHttpService],
    imports: [DeviceModule, DeviceUtilModule],
})
export class DeviceHttpModule {}
