import { Module } from '@nestjs/common';
import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { HealthSystemController } from '@modules/health/controllers/health.system.controller';
import { HealthModule } from '@modules/health/health.module';
import { RoleSystemController } from '@modules/role/controllers/role.system.controller';
import { RoleModule } from '@modules/role/role.module';
import { SettingSystemController } from '@modules/setting/controllers/setting.system.controller';
import { SettingModule } from '@modules/setting/setting.module';
import { UserSystemController } from '@modules/user/controllers/user.system.controller';
import { UserModule } from '@modules/user/user.module';

@Module({
    controllers: [
        HealthSystemController,
        SettingSystemController,
        RoleSystemController,
        UserSystemController,
    ],
    providers: [],
    exports: [],
    imports: [
        HealthModule,
        SettingModule,
        UserModule,
        RoleModule,
        HealthModule,
        ApiKeyModule,
    ],
})
export class RoutesSystemModule {}
