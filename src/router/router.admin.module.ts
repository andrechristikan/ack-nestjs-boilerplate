import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PermissionAdminController } from 'src/permission/controller/permission.admin.controller';
import { PermissionModule } from 'src/permission/permission.module';
import { RoleAdminController } from 'src/role/controller/role.admin.controller';
import { RoleModule } from 'src/role/role.module';
import { SettingAdminController } from 'src/setting/controller/setting.admin.controller';
import { UserAdminController } from 'src/user/controller/user.admin.controller';
import { UserModule } from 'src/user/user.module';

@Module({
    controllers: [
        RoleAdminController,
        UserAdminController,
        PermissionAdminController,
        SettingAdminController,
    ],
    providers: [],
    exports: [],
    imports: [AuthModule, RoleModule, UserModule, PermissionModule],
})
export class RouterAdminModule {}
