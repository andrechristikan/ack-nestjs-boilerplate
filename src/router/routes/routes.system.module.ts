import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { RoleSystemController } from '@modules/role/controllers/role.system.controller';
import { RoleModule } from '@modules/role/role.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [RoleSystemController],
    providers: [],
    exports: [],
    imports: [ApiKeyModule, RoleModule],
})
export class RoutesSystemModule {}
