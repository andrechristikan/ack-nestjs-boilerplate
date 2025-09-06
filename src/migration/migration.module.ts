import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { CommonModule } from '@common/common.module';
import { MigrationApiKeySeed } from '@migration/seeds/migration.api-key.seed';
import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { MigrationCountrySeed } from '@migration/seeds/migration.country.seed';
import { CountryModule } from '@modules/country/country.module';
import { MigrationRoleSeed } from '@migration/seeds/migration.role.seed';
import { RoleModule } from '@modules/role/role.module';
import { MigrationCreateSeed } from '@migration/seeds/migration.user.seed';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
    imports: [
        CommonModule,
        CommandModule,
        ApiKeyModule,
        CountryModule,
        RoleModule,
        AuthModule,
    ],
    providers: [
        MigrationApiKeySeed,
        MigrationCountrySeed,
        MigrationRoleSeed,
        MigrationCreateSeed,
    ],
    exports: [],
})
export class MigrationModule {}
