import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PaginationModule } from 'src/common/pagination/pagination.module';
import { CountrySystemController } from 'src/modules/country/controllers/country.system.controller';
import { CountryModule } from 'src/modules/country/country.module';
import { HealthSystemController } from 'src/modules/health/controllers/health.system.controller';
import { HealthModule } from 'src/modules/health/health.module';
import { RoleSystemController } from 'src/modules/role/controllers/role.system.controller';
import { RoleModule } from 'src/modules/role/role.module';
import { SettingSystemController } from 'src/modules/setting/controllers/setting.system.controller';
import { SettingModule } from 'src/modules/setting/setting.module';
import { UserSystemController } from 'src/modules/user/controllers/user.system.controller';
import { UserModule } from 'src/modules/user/user.module';

@Module({
    controllers: [
        HealthSystemController,
        SettingSystemController,
        CountrySystemController,
        UserSystemController,
        RoleSystemController,
    ],
    providers: [],
    exports: [],
    imports: [
        HealthModule,
        TerminusModule,
        PaginationModule,
        SettingModule,
        CountryModule,
        UserModule,
        RoleModule,
    ],
})
export class RoutesSystemModule {}
