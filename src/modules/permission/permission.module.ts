import { Module } from '@nestjs/common';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseConnectModule } from 'src/common/database/database.module';
import { PermissionRepository } from './repositories/permission.repository';
import {
    PermissionSchema,
    PermissionDatabaseName,
    PermissionEntity,
} from './schemas/permission.schema';
import { PermissionBulkService } from './services/permission.bulk.service';
import { PermissionService } from './services/permission.service';

@Module({
    controllers: [],
    providers: [PermissionService, PermissionBulkService, PermissionRepository],
    exports: [PermissionService, PermissionBulkService],
    imports: [
        DatabaseConnectModule.register({
            name: PermissionEntity.name,
            schema: PermissionSchema,
            collection: PermissionDatabaseName,
            connectionName: DATABASE_CONNECTION_NAME,
        }),
    ],
})
export class PermissionModule {}
