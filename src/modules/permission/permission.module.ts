import { Module } from '@nestjs/common';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseConnectModule } from 'src/common/database/database.module';
import { PermissionBulkRepository } from './repositories/permission.bulk.repository';
import { PermissionRepository } from './repositories/permission.repository';
import {
    Permission,
    PermissionDatabaseName,
    PermissionEntity,
} from './schemas/permission.schema';
import { PermissionBulkService } from './services/permission.bulk.service';
import { PermissionService } from './services/permission.service';

@Module({
    controllers: [],
    providers: [
        PermissionService,
        PermissionBulkService,
        PermissionRepository,
        PermissionBulkRepository,
    ],
    exports: [PermissionService, PermissionBulkService],
    imports: [
        DatabaseConnectModule.register({
            name: PermissionEntity.name,
            schema: Permission,
            collection: PermissionDatabaseName,
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
})
export class PermissionModule {}
