import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { AuthModule } from 'src/common/auth/auth.module';
import { CommonModule } from 'src/common/common.module';
import { MigrationApiKeySeed } from 'src/migration/seeds/migration.api-key.seed';
import { MigrationEmailSeed } from 'src/migration/seeds/migration.email.seed';
import { MigrationRoleSeed } from 'src/migration/seeds/migration.role.seed';
import { MigrationSettingSeed } from 'src/migration/seeds/migration.setting.seed';
import { MigrationUserSeed } from 'src/migration/seeds/migration.user.seed';
import { EmailModule } from 'src/modules/email/email.module';
import { RoleModule } from 'src/modules/role/role.module';
import { SettingModule } from 'src/modules/setting/setting.module';
import { UserModule } from 'src/modules/user/user.module';
@Module({
    imports: [
        CommonModule,
        CommandModule,
        ApiKeyModule,
        SettingModule,
        EmailModule,
        AuthModule,
        RoleModule,
        UserModule,
        SettingModule,
    ],
    providers: [
        MigrationApiKeySeed,
        MigrationSettingSeed,
        MigrationEmailSeed,
        MigrationUserSeed,
        MigrationRoleSeed,
        MigrationSettingSeed,
    ],
    exports: [],
})
export class MigrationModule {}
