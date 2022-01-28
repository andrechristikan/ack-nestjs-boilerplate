import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PaginationModule } from 'src/pagination/pagination.module';
import { PermissionAdminController } from 'src/permission/permission.controller';
import { PermissionModule } from 'src/permission/permission.module';
import { RoleAdminController } from 'src/role/role.controller';
import { RoleModule } from 'src/role/role.module';
import { UserAdminController } from 'src/user/user.controller';
import { UserModule } from 'src/user/user.module';

@Module({
    controllers: [
        RoleAdminController,
        UserAdminController,
        PermissionAdminController,
    ],
    providers: [],
    exports: [],
    imports: [
        AuthModule,
        RoleModule,
        UserModule,
        PermissionModule,
        PaginationModule,
    ],
})
export class RouterAdminModule {}
