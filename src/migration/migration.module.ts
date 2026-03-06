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
import { MigrationAwsS3ConfigSeed } from '@migration/seeds/migration.aws-s3-config.seed';
import { AwsModule } from '@common/aws/aws.module';
import { MigrationTemplateEmailNotificationSeed } from '@migration/seeds/migration.template-notification.seed';
import { MigrationTemplateTermPolicySeed } from '@migration/seeds/migration.template-term-policy.seed';

/**
 * Migration module that provides database seeding and removal functionality.
 *
 * This module manages all database seed providers used during development and initial deployment.
 * It handles seeding and removal of the following data:
 * - **API Keys**: Default API keys for third-party integrations
 * - **Countries**: Country reference data used throughout the application
 * - **Feature Flags**: Feature toggle configurations
 * - **Roles**: User role definitions and permissions
 * - **Term Policies**: Terms and policy framework data
 * - **Users**: Default user accounts for testing
 * - **Email Templates**: Email notification templates
 * - **Term Policy Templates**: Term policy document templates
 * - **AWS S3 Configuration**: S3 bucket and storage configuration
 */
@Module({
    imports: [CommonModule, CountryModule, UserModule, AwsModule],
    providers: [
        MigrationApiKeySeed,
        MigrationCountrySeed,
        MigrationFeatureFlagSeed,
        MigrationRoleSeed,
        MigrationTermPolicySeed,
        MigrationUserSeed,
        MigrationTemplateEmailNotificationSeed,
        MigrationTemplateTermPolicySeed,
        MigrationAwsS3ConfigSeed,
    ],
    exports: [],
})
export class MigrationModule {}
