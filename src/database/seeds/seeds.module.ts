import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { PermissionModule } from 'src/permission/permission.module';

import { PermissionSeed } from 'src/database/seeds/permission.seed';
import { RoleSeed } from './role.seed';
import { RoleModule } from 'src/role/role.module';
import { UserSeed } from './user.seed';
import { UserModule } from 'src/user/user.module';
import { ProductSeed } from './product.seed';
import { ProductModule } from 'src/product/product.module';

@Module({
    imports: [
        CommandModule,
        PermissionModule,
        RoleModule,
        UserModule,
        ProductModule
    ],
    providers: [PermissionSeed, RoleSeed, UserSeed, ProductSeed],
    exports: []
})
export class SeedsModule {}
