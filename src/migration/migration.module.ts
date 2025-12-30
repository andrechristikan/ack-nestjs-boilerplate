import { Module } from '@nestjs/common';
import { CommonModule } from '@common/common.module';
import { MigrationApiKeySeed } from '@migration/seeds/migration.api-key.seed';
import { CountryModule } from '@modules/country/country.module';
import { UserModule } from '@modules/user/user.module';
import { MigrationCountrySeed } from '@migration/seeds/migration.country.seed';
import { MigrationFeatureFlagSeed } from '@migration/seeds/migration.feature-flag.seed';
import { MigrationRoleSeed } from '@migration/seeds/migration.role.seed';
import { MigrationTermPolicySeed } from '@migration/seeds/migration.term-policy.seed';
import { MigrationUserSeed } from '@migration/seeds/migration.user.seed';
import { MigrationTemplateEmailSeed } from '@migration/seeds/migration.template-email.seed';
import { MigrationTemplateTermPolicySeed } from '@migration/seeds/migration.template-term-policy.seed';
import { EmailModule } from '@modules/email/email.module';
import { MigrationAwsS3ConfigSeed } from '@migration/seeds/migration.aws-s3-config.seed';
import { AwsModule } from '@common/aws/aws.module';

/**
 * Migration module that provides database seeding functionality.
 * Contains seed providers for API keys, countries, roles, users, and feature flags.
 */
@Module({
    imports: [CommonModule, CountryModule, UserModule, EmailModule, AwsModule],
    providers: [
        MigrationApiKeySeed,
        MigrationCountrySeed,
        MigrationFeatureFlagSeed,
        MigrationRoleSeed,
        MigrationTermPolicySeed,
        MigrationUserSeed,
        MigrationTemplateEmailSeed,
        MigrationTemplateTermPolicySeed,
        MigrationAwsS3ConfigSeed,
    ],
    exports: [],
})
export class MigrationModule {}
