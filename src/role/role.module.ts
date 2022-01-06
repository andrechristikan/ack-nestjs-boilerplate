import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaginationModule } from 'src/pagination/pagination.module';
import { PermissionModule } from 'src/permission/permission.module';
import { RoleService } from 'src/role/role.service';
import { UserModule } from 'src/user/user.module';
import { RoleAdminController } from './role.controller';
import { RoleDatabaseName, RoleEntity, RoleSchema } from './role.schema';

@Module({
    controllers: [RoleAdminController],
    providers: [RoleService],
    exports: [RoleService],
    imports: [
        MongooseModule.forFeature([
            {
                name: RoleEntity.name,
                schema: RoleSchema,
                collection: RoleDatabaseName
            }
        ]),
        PaginationModule,
        UserModule,
        PermissionModule
    ]
})
export class RoleModule {}
