import { Module } from '@nestjs/common';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { DeviceOwnershipRepository } from '@modules/device/repositories/device.ownership.repository';

/** Device ownership tracking and notification-token lifecycle; exports providers for consumers, registers no routes of its own. */
@Module({
    imports: [],
    exports: [DeviceService, DeviceUtil, DeviceOwnershipRepository],
    providers: [DeviceService, DeviceUtil, DeviceOwnershipRepository],
    controllers: [],
})
export class DeviceModule {}
