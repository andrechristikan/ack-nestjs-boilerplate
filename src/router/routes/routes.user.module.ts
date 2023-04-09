import { Module } from '@nestjs/common';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { ApiKeyUserController } from 'src/common/api-key/controllers/api-key.user.controller';
import { RoleModule } from 'src/common/role/role.module';
import { UserUserController } from 'src/modules/user/controllers/user.user.controller';
import { UserModule } from 'src/modules/user/user.module';

@Module({
    controllers: [ApiKeyUserController, UserUserController],
    providers: [],
    exports: [],
    imports: [UserModule, ApiKeyModule, RoleModule],
})
export class RoutesUserModule {}
