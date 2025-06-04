import { Module } from '@nestjs/common';
import { ApiKeyModule } from '@module/api-key/api-key.module';
import { CountrySystemController } from '@module/country/controllers/country.system.controller';
import { CountryModule } from '@module/country/country.module';
import { HealthSystemController } from '@module/health/controllers/health.system.controller';
import { HealthModule } from '@module/health/health.module';
import { RoleSystemController } from '@module/role/controllers/role.system.controller';
import { RoleModule } from '@module/role/role.module';
import { SettingSystemController } from '@module/setting/controllers/setting.system.controller';
import { SettingModule } from '@module/setting/setting.module';
import { UserSystemController } from '@module/user/controllers/user.system.controller';
import { UserModule } from '@module/user/user.module';

@Module({
    controllers: [
        HealthSystemController,
        SettingSystemController,
        CountrySystemController,
        RoleSystemController,
        UserSystemController,
    ],
    providers: [],
    exports: [],
    imports: [
        HealthModule,
        SettingModule,
        CountryModule,
        UserModule,
        RoleModule,
        HealthModule,
        ApiKeyModule,
    ],
})
export class RoutesSystemModule {}
