import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaginationModule } from 'src/pagination/pagination.module';
import { RoleService } from 'src/role/role.service';
import { RoleController } from './role.controller';
import { RoleDatabaseName, RoleEntity, RoleSchema } from './role.schema';

@Module({
    controllers: [RoleController],
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
        PaginationModule
    ]
})
export class RoleModule {}
