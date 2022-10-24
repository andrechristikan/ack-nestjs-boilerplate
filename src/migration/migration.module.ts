import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { AuthApiModule, AuthModule } from 'src/common/auth/auth.module';
import { CommonModule } from 'src/common/common.module';
import { PermissionSeed } from 'src/migration/seeds/permission.seed';
import { RoleSeed } from 'src/migration/seeds/role.seed';
import { SettingSeed } from 'src/migration/seeds/setting.seed';
import { UserSeed } from 'src/migration/seeds/user.seed';
import { PermissionModule } from 'src/modules/permission/permission.module';
import { RoleModule } from 'src/modules/role/role.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthApiSeed } from './seeds/auth.api.seed';

@Module({
    imports: [
        CommonModule,
        CommandModule,
        AuthModule,
        AuthApiModule,
        PermissionModule,
        RoleModule,
        UserModule,
    ],
    providers: [AuthApiSeed, SettingSeed, PermissionSeed, RoleSeed, UserSeed],
    exports: [],
})
export class MigrationModule {}
