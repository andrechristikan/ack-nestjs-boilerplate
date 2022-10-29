import { Module } from '@nestjs/common';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseConnectModule } from 'src/common/database/database.module';
import { RoleEnumService } from 'src/modules/role/services/role.enum.service';
import { RoleRepository } from './repositories/role.repository';
import {
    RoleDatabaseName,
    RoleEntity,
    RoleSchema,
} from './schemas/role.schema';
import { RoleBulkService } from './services/role.bulk.service';
import { RoleService } from './services/role.service';

@Module({
    controllers: [],
    providers: [RoleService, RoleBulkService, RoleEnumService, RoleRepository],
    exports: [RoleService, RoleBulkService, RoleEnumService],
    imports: [
        DatabaseConnectModule.register({
            name: RoleEntity.name,
            schema: RoleSchema,
            collection: RoleDatabaseName,
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
})
export class RoleModule {}
