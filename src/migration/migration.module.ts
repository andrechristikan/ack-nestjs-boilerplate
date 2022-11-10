import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { AuthModule } from 'src/common/auth/auth.module';
import { CommonModule } from 'src/common/common.module';
import { MigrationApiKeySeed } from 'src/migration/seeds/migration.api-key.seed';
import { PermissionSeed } from 'src/migration/seeds/migration.permission.seed';
import { RoleSeed } from 'src/migration/seeds/migration.role.seed';
import { MigrationSettingSeed } from 'src/migration/seeds/migration.setting.seed';
import { UserSeed } from 'src/migration/seeds/migration.user.seed';
import { PermissionModule } from 'src/modules/permission/permission.module';
import { RoleModule } from 'src/modules/role/role.module';
import { UserModule } from 'src/modules/user/user.module';

@Module({
    imports: [
        CommonModule,
        CommandModule,
        ApiKeyModule,
        PermissionModule,
        UserModule,
        RoleModule,
        AuthModule,
    ],
    providers: [
        MigrationApiKeySeed,
        MigrationSettingSeed,
        PermissionSeed,
        RoleSeed,
        UserSeed,
    ],
    exports: [],
})
export class MigrationModule {}
