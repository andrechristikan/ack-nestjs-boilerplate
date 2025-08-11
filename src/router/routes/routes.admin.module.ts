import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { ApiKeyAdminController } from '@modules/api-key/controllers/api-key.admin.controller';
import { RoleAdminController } from '@modules/role/controllers/role.admin.controller';
import { RoleModule } from '@modules/role/role.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [ApiKeyAdminController, RoleAdminController],
    providers: [],
    exports: [],
    imports: [ApiKeyModule, RoleModule],
})
export class RoutesAdminModule {}
