import { DeviceModule } from '@modules/device/device.module';
import { DeviceGetListCursorUseCase } from '@modules/device/use-cases/device.get-list-cursor.use-case';
import { DeviceGetListOffsetByAdminUseCase } from '@modules/device/use-cases/device.get-list-offset-by-admin.use-case';
import { DeviceRefreshUseCase } from '@modules/device/use-cases/device.refresh.use-case';
import { DeviceRemoveByAdminUseCase } from '@modules/device/use-cases/device.remove-by-admin.use-case';
import { DeviceRemoveUseCase } from '@modules/device/use-cases/device.remove.use-case';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        DeviceGetListOffsetByAdminUseCase,
        DeviceGetListCursorUseCase,
        DeviceRefreshUseCase,
        DeviceRemoveUseCase,
        DeviceRemoveByAdminUseCase,
    ],
    exports: [
        DeviceGetListOffsetByAdminUseCase,
        DeviceGetListCursorUseCase,
        DeviceRefreshUseCase,
        DeviceRemoveUseCase,
        DeviceRemoveByAdminUseCase,
    ],
    imports: [DeviceModule],
})
export class DeviceUseCaseModule {}
