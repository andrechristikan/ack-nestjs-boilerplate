import { DeviceUtil } from '@modules/device/utils/device.util';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [DeviceUtil],
    exports: [DeviceUtil],
    imports: [],
})
export class DeviceUtilModule {}
