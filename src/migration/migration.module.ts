import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { CommonModule } from '@common/common.module';
import { MigrationApiKeySeed } from '@migration/seeds/migration.api-key.seed';
import { MigrationCountrySeed } from '@migration/seeds/migration.country.seed';
import { CountryModule } from '@modules/country/country.module';
import { MigrationRoleSeed } from '@migration/seeds/migration.role.seed';
import { MigrationCreateSeed } from '@migration/seeds/migration.user.seed';
import { AuthModule } from '@modules/auth/auth.module';

// TODO: 6, Change to commander package
@Module({
    imports: [CommonModule, CommandModule, CountryModule, AuthModule],
    providers: [
        MigrationApiKeySeed,
        MigrationCountrySeed,
        MigrationRoleSeed,
        MigrationCreateSeed,
    ],
    exports: [],
})
export class MigrationModule {}
