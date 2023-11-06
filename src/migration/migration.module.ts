import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { AuthModule } from 'src/common/auth/auth.module';
import { CommonModule } from 'src/common/common.module';
import { UserModule } from 'src/modules/user/user.module';
import { RoleModule } from 'src/modules/role/role.module';
import { MigrationApiKeySeed } from 'src/migration/seeds/migration.api-key.seed';
import { MigrationRoleSeed } from 'src/migration/seeds/migration.role.seed';
import { MigrationUserSeed } from 'src/migration/seeds/migration.user.seed';
import { EmailModule } from 'src/modules/email/email.module';
import { MigrationEmailSeed } from 'src/migration/seeds/migration.email.seed';

@Module({
    imports: [
        CommonModule,
        CommandModule,
        ApiKeyModule,
        AuthModule,
        RoleModule,
        UserModule,
        EmailModule,
    ],
    providers: [
        MigrationApiKeySeed,
        MigrationRoleSeed,
        MigrationUserSeed,
        MigrationEmailSeed,
    ],
    exports: [],
})
export class MigrationModule {}
