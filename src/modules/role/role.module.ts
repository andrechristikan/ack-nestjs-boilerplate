import { Module } from '@nestjs/common';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseConnectModule } from 'src/common/database/database.module';
import { RoleBulkRepository } from './repositories/role.bulk.repository';
import { RoleRepository } from './repositories/role.repository';
import { RoleDatabaseName, RoleEntity, Role } from './schemas/role.schema';
import { RoleBulkService } from './services/role.bulk.service';
import { RoleService } from './services/role.service';

@Module({
    controllers: [],
    providers: [
        RoleService,
        RoleBulkService,
        RoleRepository,
        RoleBulkRepository,
    ],
    exports: [RoleService, RoleBulkService],
    imports: [
        DatabaseConnectModule.register({
            name: RoleEntity.name,
            schema: Role,
            collection: RoleDatabaseName,
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
})
export class RoleModule {}
