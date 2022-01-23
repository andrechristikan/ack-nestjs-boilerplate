import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { PermissionModule } from 'src/permission/permission.module';

import { PermissionSeed } from 'src/database/seeds/permission.seed';
import { RoleSeed } from './role.seed';
import { RoleModule } from 'src/role/role.module';
import { UserSeed } from './user.seed';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';
import { CoreModule } from 'src/core/core.module';

@Module({
    imports: [
        CoreModule,
        CommandModule,
        PermissionModule,
        UserModule,
        AuthModule,
        RoleModule,
    ],
    providers: [PermissionSeed, RoleSeed, UserSeed],
    exports: [],
})
export class SeedsModule {}
