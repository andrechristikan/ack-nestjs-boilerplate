import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { PermissionModule } from 'src/permission/permission.module';

import { PermissionSeed } from 'src/database/seeds/permission.seed';
import { RoleSeed } from './role.seed';
import { RoleModule } from 'src/role/role.module';

@Module({
    imports: [CommandModule, PermissionModule, RoleModule],
    providers: [PermissionSeed, RoleSeed],
    exports: []
})
export class SeedsModule {}
