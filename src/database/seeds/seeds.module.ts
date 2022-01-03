import { DynamicModule, Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { PermissionModule } from 'src/permission/permission.module';

import { PermissionSeed } from 'src/database/seeds/permission.seed';
import { RoleSeed } from './role.seed';
import { RoleModule } from 'src/role/role.module';
import { UserSeed } from './user.seed';
import { UserModule } from 'src/user/user.module';

@Module({})
export class SeedsModule {
    static register({ env }): DynamicModule {
        if (env !== 'production') {
            return {
                module: SeedsModule,
                imports: [
                    CommandModule,
                    PermissionModule,
                    RoleModule,
                    UserModule
                ],
                providers: [PermissionSeed, RoleSeed, UserSeed],
                exports: []
            };
        }

        return {
            module: SeedsModule,
            imports: [],
            providers: [],
            exports: []
        };
    }
}
