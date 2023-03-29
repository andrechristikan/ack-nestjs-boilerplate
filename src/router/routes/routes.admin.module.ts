import { Module } from '@nestjs/common';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { ApiKeyAdminController } from 'src/common/api-key/controllers/api-key.admin.controller';
import { AuthModule } from 'src/common/auth/auth.module';
import { SettingAdminController } from 'src/common/setting/controllers/setting.admin.controller';
// import { PermissionAdminController } from 'src/modules/permission/controllers/permission.admin.controller';
// import { PermissionModule } from 'src/modules/permission/permission.module';
// import { RoleAdminController } from 'src/modules/role/controllers/role.admin.controller';
// import { RoleModule } from 'src/modules/role/role.module';
// import { UserAdminController } from 'src/modules/user/controllers/user.admin.controller';
// import { UserModule } from 'src/modules/user/user.module';

@Module({
    controllers: [
        SettingAdminController,
        ApiKeyAdminController,
        // PermissionAdminController,
        // RoleAdminController,
        // UserAdminController,
    ],
    providers: [],
    exports: [],
    imports: [
        AuthModule,
        ApiKeyModule,
        // PermissionModule,
        // RoleModule,
        // UserModule,
    ],
})
export class RoutesAdminModule {}
