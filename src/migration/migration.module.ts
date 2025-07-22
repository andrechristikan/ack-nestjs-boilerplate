import { VerificationModule } from '@modules/verification/verification.module';
import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { CommonModule } from '@common/common.module';
import { MigrationApiKeySeed } from '@migration/seeds/migration.api-key.seed';
import { MigrationCountrySeed } from '@migration/seeds/migration.country.seed';
import { MigrationRoleSeed } from '@migration/seeds/migration.role.seed';
import { MigrationTemplateSeed } from '@migration/seeds/migration.template.seed';
import { MigrationUserSeed } from '@migration/seeds/migration.user.seed';
import { ActivityModule } from '@modules/activity/activity.module';
import { ApiKeyModule } from '@modules/api-key/api-key.module';
import { AuthModule } from '@modules/auth/auth.module';
import { CountryModule } from '@modules/country/country.module';
import { EmailModule } from '@modules/email/email.module';
import { PasswordHistoryModule } from '@modules/password-history/password-history.module';
import { RoleModule } from '@modules/role/role.module';
import { SessionModule } from '@modules/session/session.module';
import { UserModule } from '@modules/user/user.module';
import { MigrationSettingFeatureSeed } from '@migration/seeds/migration.settings.seed';
import { SettingModule } from '@modules/setting/setting.module';
import { MigrationTermPolicySeed } from '@migration/seeds/migration.term-policy.seed';
import { TermPolicyModule } from '@modules/term-policy/term-policy.module';
import { AwsModule } from '@modules/aws/aws.module';

// TODO: (v8) CHANGE WITH COMMANDER
@Module({
    imports: [
        CommonModule,
        CommandModule,
        ApiKeyModule,
        CountryModule,
        EmailModule,
        AuthModule,
        RoleModule,
        UserModule,
        ActivityModule,
        PasswordHistoryModule,
        SessionModule,
        CountryModule,
        VerificationModule,
        SettingModule,
        TermPolicyModule,
        AwsModule,
    ],
    providers: [
        MigrationApiKeySeed,
        MigrationCountrySeed,
        MigrationUserSeed,
        MigrationRoleSeed,
        MigrationTemplateSeed,
        MigrationSettingFeatureSeed,
        MigrationTermPolicySeed,
    ],
    exports: [],
})
export class MigrationModule {}
