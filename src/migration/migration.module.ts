import { VerificationModule } from '@module/verification/verification.module';
import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { CommonModule } from '@common/common.module';
import { MigrationApiKeySeed } from '@migration/seeds/migration.api-key.seed';
import { MigrationCountrySeed } from '@migration/seeds/migration.country.seed';
import { MigrationRoleSeed } from '@migration/seeds/migration.role.seed';
import { MigrationTemplateSeed } from '@migration/seeds/migration.template.seed';
import { MigrationUserSeed } from '@migration/seeds/migration.user.seed';
import { ActivityModule } from '@module/activity/activity.module';
import { ApiKeyModule } from '@module/api-key/api-key.module';
import { AuthModule } from '@module/auth/auth.module';
import { CountryModule } from '@module/country/country.module';
import { EmailModule } from '@module/email/email.module';
import { PasswordHistoryModule } from '@module/password-history/password-history.module';
import { RoleModule } from '@module/role/role.module';
import { SessionModule } from '@module/session/session.module';
import { UserModule } from '@module/user/user.module';

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
    ],
    providers: [
        MigrationApiKeySeed,
        MigrationCountrySeed,
        MigrationUserSeed,
        MigrationRoleSeed,
        MigrationTemplateSeed,
    ],
    exports: [],
})
export class MigrationModule {}
