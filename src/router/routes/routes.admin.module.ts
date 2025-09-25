import { ApiKeyAdminController } from '@modules/api-key/controllers/api-key.admin.controller';
import { RoleAdminController } from '@modules/role/controllers/role.admin.controller';
import { UserAdminController } from '@modules/user/controllers/user.admin.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [
        ApiKeyAdminController,
        RoleAdminController,
        UserAdminController,
    ],
    providers: [],
    exports: [],
    imports: [UserModule],
})
export class RoutesAdminModule {}
