import { Module } from '@nestjs/common';
import { SettingAdminController } from 'src/common/setting/controllers/setting.admin.controller';
import { PermissionAdminController } from 'src/modules/permission/controllers/permission.admin.controller';
import { PermissionModule } from 'src/modules/permission/permission.module';

@Module({
    controllers: [SettingAdminController, PermissionAdminController],
    providers: [],
    exports: [],
    imports: [PermissionModule],
})
export class RoutesAdminModule {}
