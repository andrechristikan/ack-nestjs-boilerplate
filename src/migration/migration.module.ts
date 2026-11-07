import { Module } from '@nestjs/common';
import { AwsModule } from '@common/aws/aws.module';
import { CommonModule } from '@common/common.module';
import { MigrationApiKeySeed } from '@migration/seeds/migration.api-key.seed';
import { MigrationAwsS3ConfigSeed } from '@migration/seeds/migration.aws-s3-config.seed';
import { MigrationCountrySeed } from '@migration/seeds/migration.country.seed';
import { MigrationFeatureFlagSeed } from '@migration/seeds/migration.feature-flag.seed';
import { MigrationPolicySeed } from '@migration/seeds/migration.policy.seed';
import { MigrationRoleSeed } from '@migration/seeds/migration.role.seed';
import { MigrationTemplateEmailNotificationSeed } from '@migration/seeds/migration.template-notification.seed';
import { MigrationTermPolicySeed } from '@migration/seeds/migration.term-policy.seed';
import { MigrationUserSeed } from '@migration/seeds/migration.user.seed';
import { MigrationWorkspaceSeed } from '@migration/seeds/migration.workspace.seed';
import { NotificationModule } from '@modules/notification/notification.module';
import { UserModule } from '@modules/user/user.module';

@Module({
    controllers: [],
    providers: [
        MigrationApiKeySeed,
        MigrationCountrySeed,
        MigrationFeatureFlagSeed,
        MigrationPolicySeed,
        MigrationRoleSeed,
        MigrationTermPolicySeed,
        MigrationUserSeed,
        MigrationWorkspaceSeed,
        MigrationTemplateEmailNotificationSeed,
        MigrationAwsS3ConfigSeed,
    ],
    exports: [],
    imports: [CommonModule, AwsModule, UserModule, NotificationModule],
})
export class MigrationModule {}
