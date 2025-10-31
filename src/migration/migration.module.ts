import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { CommonModule } from '@common/common.module';
import { MigrationApiKeySeed } from '@migration/seeds/migration.api-key.seed';
import { MigrationCountrySeed } from '@migration/seeds/migration.country.seed';
import { CountryModule } from '@modules/country/country.module';
import { MigrationRoleSeed } from '@migration/seeds/migration.role.seed';
import { MigrationUserSeed } from '@migration/seeds/migration.user.seed';
import { AuthModule } from '@modules/auth/auth.module';
import { MigrationFeatureFlagSeed } from '@migration/seeds/migration.feature-flag.seed';
import { UserModule } from '@modules/user/user.module';

/**
 * Migration module that provides database seeding functionality.
 * Contains seed providers for API keys, countries, roles, users, and feature flags.
 */
// TODO: LAST - LAST
// Change to commander package
@Module({
    imports: [
        CommonModule,
        CommandModule,
        CountryModule,
        AuthModule,
        UserModule,
    ],
    providers: [
        MigrationApiKeySeed,
        MigrationCountrySeed,
        MigrationRoleSeed,
        MigrationUserSeed,
        MigrationFeatureFlagSeed,
    ],
    exports: [],
})
export class MigrationModule {}
