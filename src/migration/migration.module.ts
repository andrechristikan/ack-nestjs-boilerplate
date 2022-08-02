import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { AppModule } from 'src/app/app.module';
import { AuthModule } from 'src/common/auth/auth.module';
import { PermissionModule } from 'src/modules/permission/permission.module';
import { RoleModule } from 'src/modules/role/role.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthApiSeed } from './seeds/auth.api.seed';
import { PermissionSeed } from './seeds/permission.seed';
import { RoleSeed } from './seeds/role.seed';
import { SettingSeed } from './seeds/setting.seed';
import { UserSeed } from './seeds/user.seed';

@Module({
    imports: [
        AppModule,
        CommandModule,
        AuthModule,
        PermissionModule,
        RoleModule,
        UserModule,
    ],
    providers: [AuthApiSeed, PermissionSeed, RoleSeed, UserSeed, SettingSeed],
    exports: [],
})
export class MigrationModule {}
