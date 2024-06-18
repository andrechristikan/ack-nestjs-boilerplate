import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PaginationModule } from 'src/common/pagination/pagination.module';
import { CountryPrivateController } from 'src/modules/country/controllers/country.private.controller';
import { CountryModule } from 'src/modules/country/country.module';
import { HealthPrivateController } from 'src/modules/health/controllers/health.private.controller';
import { HealthModule } from 'src/modules/health/health.module';
import { SettingPrivateController } from 'src/modules/setting/controllers/setting.private.controller';
import { SettingModule } from 'src/modules/setting/setting.module';

@Module({
    controllers: [
        HealthPrivateController,
        SettingPrivateController,
        CountryPrivateController,
    ],
    providers: [],
    exports: [],
    imports: [
        HealthModule,
        TerminusModule,
        PaginationModule,
        SettingModule,
        CountryModule,
    ],
})
export class RoutesPrivateModule {}
